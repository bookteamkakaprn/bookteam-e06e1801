import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  Copy,
  Check,
  CreditCard,
  MapPin,
  Users,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inscricao/$eventoId")({
  head: () => ({
    meta: [
      {
        title: "Inscrição — Book Team",
      },
      {
        name: "robots",
        content: "noindex",
      },
    ],
  }),
  component: InscricaoPage,
});

type Evento = {
  id: string;
  titulo: string;
  livro_id: string | null;
  descricao: string | null;
  cidade: string | null;
  local: string | null;
  data: string;
  hora: string | null;
  valor: number;
  vagas: number;
  status: string;
  pix_chave: string | null;
  pix_qrcode_url: string | null;
  pix_copia_cola: string | null;
};

type Livro = {
  id: string;
  titulo: string;
  autor: string | null;
  ordem: number | null;
  imagem_url: string | null;
};

type Turma = {
  id: string;
  livro_id: string;
  nome: string | null;
  turma: string | null;
  ano: number | null;
  temporada: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  horario: string | null;
  professor: string | null;
  coordenador: string | null;
  staff: string | null;
  sala: string | null;
  valor: number | null;
  vagas_max: number;
  inscritos: number;
  vagas_restantes: number;
  status: string;
};

type InscricaoCriada = {
  id: string;
  codigo: string | null;
};

function moeda(valor: number | null | undefined) {
  return Number(valor ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBR(data: string | null | undefined) {
  if (!data) return "";

  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarDataLonga(data: string | null | undefined) {
  if (!data) return "";

  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function InscricaoPage() {
  const { eventoId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [livrosConcluidos, setLivrosConcluidos] = useState<number[]>([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState<string>("");
  const [etapa, setEtapa] = useState<"confirmacao" | "pagamento">(
    "confirmacao",
  );
  const [inscricao, setInscricao] = useState<InscricaoCriada | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);
  const [criando, setCriando] = useState(false);

  /*
   * Busca o evento escolhido.
   */
  const { data, isLoading, error } = useQuery({
    queryKey: ["inscricao-evento", eventoId],
    enabled: !!eventoId,
    queryFn: async () => {
      const eventoRes = await supabase
        .from("eventos")
        .select("*")
        .eq("id", eventoId)
        .maybeSingle();

      if (eventoRes.error) {
        throw eventoRes.error;
      }

      if (!eventoRes.data) {
        return {
          evento: null,
          livro: null,
          turmas: [],
        };
      }

      const evento = eventoRes.data as Evento;

      let livro: Livro | null = null;

      if (evento.livro_id) {
        const livroRes = await supabase
          .from("livros")
          .select("id, titulo, autor, ordem, imagem_url")
          .eq("id", evento.livro_id)
          .maybeSingle();

        if (livroRes.error) {
          throw livroRes.error;
        }

        livro = livroRes.data as Livro | null;
      }

      let turmas: Turma[] = [];

      if (evento.livro_id) {
        const turmasRes = await supabase
          .from("turmas")
          .select("*")
          .eq("livro_id", evento.livro_id)
          .order("data_inicio", { ascending: true });

        if (turmasRes.error) {
          throw turmasRes.error;
        }

        turmas = (turmasRes.data ?? []) as Turma[];
      }

      return {
        evento,
        livro,
        turmas,
      };
    },
  });

  /*
   * Livros da jornada.
   *
   * Aqui deixamos os 10 livros disponíveis para a pessoa declarar
   * quais já concluiu antes de entrar no site.
   */
  const jornada = [
    "Mantenha Seu Amor Aceso",
    "Cultura da Honra",
    "Livro 3",
    "Livro 4",
    "Organize a Sua Desordem Mental",
    "O Despertar da Leoa",
    "Livro 7",
    "Os Caminhos Sobrenaturais da Realeza",
    "O Poder Sobrenatural de uma Mente Transformada",
    "Impunível",
  ];

  const ultimoLivroConcluido = (() => {
    let ultimo = 0;

    for (let i = 1; i <= 10; i++) {
      if (livrosConcluidos.includes(i)) {
        ultimo = i;
      } else {
        break;
      }
    }

    return ultimo;
  })();

  const proximoLivro = ultimoLivroConcluido + 1;

  const possuiSequenciaInvalida = livrosConcluidos.some(
    (numero) => numero > ultimoLivroConcluido + 1,
  );

  function alternarLivro(numero: number) {
    setLivrosConcluidos((atual) => {
      if (atual.includes(numero)) {
        return atual.filter((item) => item !== numero);
      }

      return [...atual, numero].sort((a, b) => a - b);
    });
  }

  function validarJornada() {
    if (possuiSequenciaInvalida) {
      toast.error(
        "Marque os livros que você já concluiu em sequência, começando pelo Livro 1.",
      );
      return false;
    }

    /*
     * Se estamos fazendo a inscrição do Livro 1,
     * não existe pré-requisito.
     */
    const ordemAtual = data?.livro?.ordem ?? null;

    if (!ordemAtual || ordemAtual <= 1) {
      return true;
    }

    /*
     * Para livros posteriores, verificamos se a pessoa informou
     * que já concluiu todos os livros anteriores.
     */
    if (ultimoLivroConcluido < ordemAtual - 1) {
      toast.error(
        `Para se inscrever no Livro ${ordemAtual}, informe primeiro que você já concluiu os livros anteriores.`,
      );
      return false;
    }

    return true;
  }

  async function copiarPix() {
    const pix = data?.evento?.pix_copia_cola;

    if (!pix) {
      toast.error("O código PIX ainda não foi cadastrado.");
      return;
    }

    try {
      await navigator.clipboard.writeText(pix);
      setPixCopiado(true);
      toast.success("Código PIX copiado.");

      window.setTimeout(() => {
        setPixCopiado(false);
      }, 2500);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  async function criarInscricao() {
    if (!user) {
      toast.error("Você precisa estar logado para continuar.");
      navigate({
        to: "/auth",
        search: {
          mode: "signin",
        },
      });
      return;
    }

    if (!data?.evento) {
      toast.error("Evento não encontrado.");
      return;
    }

    if (!validarJornada()) {
      return;
    }

    if (data.turmas.length > 0 && !turmaSelecionada) {
      toast.error("Selecione a turma da qual deseja participar.");
      return;
    }

    setCriando(true);

    try {
      /*
       * Se já existe uma inscrição para esse evento,
       * reutilizamos a existente em vez de criar duplicada.
       */
      const existenteRes = await supabase
        .from("inscricoes")
        .select("id, codigo")
        .eq("participante_id", user.id)
        .eq("evento_id", data.evento.id)
        .maybeSingle();

      if (existenteRes.error) {
        throw existenteRes.error;
      }

      let inscricaoCriada: InscricaoCriada;

      if (existenteRes.data) {
        inscricaoCriada = existenteRes.data as InscricaoCriada;
      } else {
        const codigo = `BT-${Date.now()
          .toString(36)
          .toUpperCase()}`;

        const inscricaoRes = await supabase
          .from("inscricoes")
          .insert({
            participante_id: user.id,
            evento_id: data.evento.id,
            turma_id: turmaSelecionada || null,
            status: "aguardando_pagamento",
            codigo,
          })
          .select("id, codigo")
          .single();

        if (inscricaoRes.error) {
          throw inscricaoRes.error;
        }

        inscricaoCriada = inscricaoRes.data as InscricaoCriada;
      }

      /*
       * Criamos o pagamento aguardando.
       *
       * O valor vem do evento, porque o evento é o encontro
       * escolhido para esta inscrição.
       */
      const pagamentoExistente = await supabase
        .from("pagamentos")
        .select("id")
        .eq("inscricao_id", inscricaoCriada.id)
        .maybeSingle();

      if (pagamentoExistente.error) {
        throw pagamentoExistente.error;
      }

      if (!pagamentoExistente.data) {
        const pagamentoRes = await supabase
          .from("pagamentos")
          .insert({
            inscricao_id: inscricaoCriada.id,
            participante_id: user.id,
            evento_id: data.evento.id,
            turma_id: turmaSelecionada || null,
            valor: Number(data.evento.valor ?? 0),
            status: "aguardando",
          });

        if (pagamentoRes.error) {
          throw pagamentoRes.error;
        }
      }

      setInscricao(inscricaoCriada);
      setEtapa("pagamento");

      toast.success("Inscrição criada. Agora faça o pagamento via PIX.");
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.message ||
          "Não foi possível criar sua inscrição. Tente novamente.",
      );
    } finally {
      setCriando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-4xl animate-pulse space-y-5">
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="h-12 w-2/3 rounded bg-muted" />
          <div className="h-40 rounded-2xl bg-muted" />
          <div className="h-60 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !data?.evento) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gold" />

          <h1 className="mt-5 font-serif text-3xl font-semibold">
            Inscrição não encontrada
          </h1>

          <p className="mt-3 text-muted-foreground">
            Não conseguimos encontrar este encontro.
          </p>

          <Button asChild className="mt-6 bg-gold text-primary-foreground">
            <Link to="/">Voltar para os livros</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { evento, livro, turmas } = data;

  const turmaEscolhida = turmas.find(
    (turma) => turma.id === turmaSelecionada,
  );

  const temPix = Boolean(evento.pix_copia_cola);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-8">
          <Link
            to="/livros/$id"
            params={{
              id: livro?.id ?? "",
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o livro
          </Link>

          <div className="text-right">
            <p className="font-serif text-sm font-semibold">
              BOOK TEAM
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-gold">
              inscrição
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        {/* INDICADOR DE ETAPAS */}
        <div className="mx-auto mb-8 flex max-w-xl items-center justify-center gap-2">
          <div
            className={`flex items-center gap-2 ${
              etapa === "confirmacao"
                ? "text-gold"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                etapa === "confirmacao"
                  ? "border-gold bg-gold text-primary-foreground"
                  : "border-gold/50"
              }`}
            >
              1
            </span>
            <span className="hidden text-sm font-medium sm:inline">
              Confirmar inscrição
            </span>
          </div>

          <div className="h-px w-10 bg-border sm:w-20" />

          <div
            className={`flex items-center gap-2 ${
              etapa === "pagamento"
                ? "text-gold"
                : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                etapa === "pagamento"
                  ? "border-gold bg-gold text-primary-foreground"
                  : "border-border"
              }`}
            >
              2
            </span>
            <span className="hidden text-sm font-medium sm:inline">
              Pagamento PIX
            </span>
          </div>
        </div>

        {/* RESUMO DO LIVRO/EVENTO */}
        <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <Card className="overflow-hidden border-gold/20">
            <div className="aspect-[2/3] max-h-[420px] bg-gradient-to-br from-[oklch(0.4_0.12_25)] to-[oklch(0.2_0.05_20)]">
              {livro?.imagem_url ? (
                <img
                  src={livro.imagem_url}
                  alt={livro.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <BookOpen className="h-14 w-14 text-gold" />

                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    Livro {livro?.ordem ?? ""}
                  </p>
                </div>
              )}
            </div>

            <CardContent className="p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
                Livro {livro?.ordem ?? ""}
              </p>

              <h2 className="mt-2 font-serif text-xl font-semibold">
                {livro?.titulo ?? "Livro Book Team"}
              </h2>

              {livro?.autor && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {livro.autor}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            {/* EVENTO */}
            <Card className="border-gold/20">
              <CardHeader>
                <CardTitle className="font-serif text-2xl">
                  {evento.titulo}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Data
                    </p>

                    <p className="font-medium capitalize">
                      {formatarDataLonga(evento.data)}
                    </p>
                  </div>
                </div>

                {evento.hora && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Horário
                      </p>

                      <p className="font-medium">
                        {evento.hora.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                )}

                {(evento.local || evento.cidade) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Local
                      </p>

                      <p className="font-medium">
                        {[evento.local, evento.cidade]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-gold" />

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Vagas
                    </p>

                    <p className="font-medium">
                      {evento.vagas > 0
                        ? `${evento.vagas} vagas disponíveis`
                        : "Consulte disponibilidade"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs text-muted-foreground">
                    Investimento
                  </p>

                  <p className="font-serif text-2xl font-semibold text-gold">
                    {moeda(evento.valor)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SELEÇÃO DOS LIVROS JÁ FEITOS */}
            {etapa === "confirmacao" && (
              <Card className="border-gold/20">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-1 h-5 w-5 shrink-0 text-gold" />

                    <div>
                      <CardTitle className="font-serif text-xl">
                        Sua jornada
                      </CardTitle>

                      <p className="mt-1 text-sm text-muted-foreground">
                        Você já concluiu algum dos livros anteriores?
                        Marque todos que já fez, inclusive aqueles
                        realizados antes deste site existir.
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    {jornada.map((titulo, index) => {
                      const numero = index + 1;
                      const marcado =
                        livrosConcluidos.includes(numero);

                      const bloqueadoPorSequencia =
                        numero > 1 &&
                        !livrosConcluidos.includes(numero - 1);

                      return (
                        <label
                          key={numero}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                            marcado
                              ? "border-gold/50 bg-gold/10"
                              : "border-border/60 hover:border-gold/30"
                          } ${
                            bloqueadoPorSequencia
                              ? "opacity-60"
                              : ""
                          }`}
                        >
                          <Checkbox
                            checked={marcado}
                            disabled={bloqueadoPorSequencia}
                            onCheckedChange={() =>
                              alternarLivro(numero)
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">
                              Livro {numero}
                            </p>

                            <p className="truncate text-sm font-medium">
                              {titulo}
                            </p>
                          </div>

                          {marcado && (
                            <Check className="h-4 w-4 shrink-0 text-gold" />
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-4 rounded-xl bg-muted/50 p-4">
                    {ultimoLivroConcluido === 0 ? (
                      <p className="text-sm">
                        <strong>Você está começando a jornada.</strong>
                        <br />
                        O Livro 1 será o seu primeiro passo.
                      </p>
                    ) : ultimoLivroConcluido >= 10 ? (
                      <p className="text-sm">
                        Você informou que já concluiu os 10 livros.
                      </p>
                    ) : (
                      <p className="text-sm">
                        <strong>
                          Último livro concluído: Livro{" "}
                          {ultimoLivroConcluido}
                        </strong>
                        <br />
                        Seu próximo passo na jornada é o{" "}
                        <strong>Livro {proximoLivro}</strong>.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TURMA */}
            {etapa === "confirmacao" && turmas.length > 0 && (
              <Card className="border-gold/20">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">
                    Escolha sua turma
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {turmas.map((turma) => {
                    const selecionada =
                      turmaSelecionada === turma.id;

                    const semVagas =
                      turma.vagas_max > 0 &&
                      turma.vagas_restantes <= 0;

                    const indisponivel =
                      turma.status !== "aberta" || semVagas;

                    return (
                      <button
                        key={turma.id}
                        type="button"
                        disabled={indisponivel}
                        onClick={() =>
                          setTurmaSelecionada(turma.id)
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          selecionada
                            ? "border-gold bg-gold/10"
                            : "border-border/60 hover:border-gold/40"
                        } ${
                          indisponivel
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {turma.turma ||
                                turma.nome ||
                                `Turma ${turma.ano ?? ""}`}
                            </p>

                            {turma.temporada && (
                              <p className="mt-1 text-xs text-gold">
                                {turma.temporada}
                              </p>
                            )}
                          </div>

                          {selecionada && (
                            <Check className="h-5 w-5 shrink-0 text-gold" />
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          {turma.data_inicio && (
                            <span>
                              Início: {dataBR(turma.data_inicio)}
                            </span>
                          )}

                          {turma.data_fim && (
                            <span>
                              Final: {dataBR(turma.data_fim)}
                            </span>
                          )}

                          {turma.horario && (
                            <span>
                              Horário: {turma.horario}
                            </span>
                          )}

                          {turma.sala && (
                            <span>
                              Sala: {turma.sala}
                            </span>
                          )}

                          {turma.professor && (
                            <span>
                              Professor: {turma.professor}
                            </span>
                          )}

                          {turma.vagas_max > 0 && (
                            <span>
                              {turma.vagas_restantes} vagas restantes
                            </span>
                          )}
                        </div>

                        {indisponivel && (
                          <p className="mt-3 text-xs font-semibold text-destructive">
                            Turma indisponível
                          </p>
                        )}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* RESUMO + CONTINUAR */}
            {etapa === "confirmacao" && (
              <Card className="border-gold/30 bg-gold/5">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Valor da inscrição
                      </p>

                      <p className="font-serif text-2xl font-semibold text-gold">
                        {moeda(evento.valor)}
                      </p>
                    </div>

                    <Button
                      size="lg"
                      onClick={criarInscricao}
                      disabled={criando}
                      className="bg-gold text-primary-foreground hover:bg-gold/90"
                    >
                      {criando ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PAGAMENTO PIX */}
            {etapa === "pagamento" && (
              <Card className="border-gold/30">
                <CardHeader>
                  <Badge className="w-fit bg-gold text-primary-foreground">
                    Inscrição criada
                  </Badge>

                  <CardTitle className="font-serif text-2xl">
                    Agora faça o pagamento
                  </CardTitle>

                  <p className="text-sm text-muted-foreground">
                    Sua vaga foi reservada. Copie o código PIX abaixo
                    e faça o pagamento no seu banco.
                  </p>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-gold" />

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Valor
                        </p>

                        <p className="font-serif text-2xl font-semibold text-gold">
                          {moeda(evento.valor)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {inscricao?.codigo && (
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <p className="text-xs text-muted-foreground">
                        Código da inscrição
                      </p>

                      <p className="mt-1 font-mono text-sm font-semibold">
                        {inscricao.codigo}
                      </p>
                    </div>
                  )}

                  {temPix ? (
                    <div>
                      <Label className="text-sm font-semibold">
                        PIX copia e cola
                      </Label>

                      <div className="mt-2 flex gap-2">
                        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted p-3">
                          <p className="break-all font-mono text-xs leading-relaxed text-muted-foreground">
                            {evento.pix_copia_cola}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={copiarPix}
                          className="shrink-0"
                        >
                          {pixCopiado ? (
                            <>
                              <Check className="mr-2 h-4 w-4 text-green-500" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gold/30 bg-gold/5 p-5">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0 text-gold" />

                        <div>
                          <p className="font-semibold">
                            PIX ainda não cadastrado
                          </p>

                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            A inscrição foi criada, mas o administrador
                            ainda não cadastrou o código PIX deste
                            encontro.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {evento.pix_qrcode_url && (
                    <div className="text-center">
                      <p className="mb-3 text-sm font-semibold">
                        Ou escaneie o QR Code
                      </p>

                      <img
                        src={evento.pix_qrcode_url}
                        alt="QR Code para pagamento PIX"
                        className="mx-auto h-56 w-56 rounded-2xl border border-border bg-white p-3"
                      />
                    </div>
                  )}

                  <div className="border-t border-border/50 pt-5">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Depois de realizar o pagamento, você poderá
                      enviar o comprovante pela sua área do aluno.
                    </p>

                    <Button
                      asChild
                      className="mt-4 w-full bg-gold text-primary-foreground hover:bg-gold/90"
                    >
                      <Link to="/pagamentos">
                        Ir para pagamentos
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
