import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  User,
  Heart,
  Loader2,
  BellRing,
} from "lucide-react";

export const Route = createFileRoute("/livros/$id")({
  head: () => ({ meta: [{ title: "Curso — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: LivroDetalhesPage,
});
type Livro = {
  id: string;
  titulo: string;
  autor: string | null;
  categoria: string | null;
  ordem: number | null;
  capa_url: string | null;
  descricao: string | null;
  objetivo: string | null;
  publico_alvo: string | null;
  conteudo_programatico: string | null;
  competencias: string | null;
  qtd_encontros: number | null;
  duracao: string | null;
  material_necessario: string | null;
  professor: string | null;
  coordenador: string | null;
  ano: number | null;
  datas_curriculo: string | null;
};
type Turma = {
  id: string;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  horario: string | null;
  sala: string | null;
  professor: string | null;
  vagas_max: number;
  vagas_restantes: number | null;
  ativo: boolean;
  livro_id: string | null;
  valor: number | null;
  inscritos: number;
};

function LivroDetalhesPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPlaceholder = id.startsWith("placeholder-");
  const { data: livro, isLoading: carregandoLivro, error: erroLivro } = useQuery({
    queryKey: ["livro-detalhes", id],
    enabled: !isPlaceholder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("livros")
        .select("id,titulo,autor,categoria,ordem,capa_url,descricao,objetivo,publico_alvo,conteudo_programatico,competencias,qtd_encontros,duracao,material_necessario,professor,coordenador,ano,datas_curriculo")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as Livro | null;
    },
  });
  const { data: turmas = [], isLoading: carregandoTurmas, error: erroTurmas } = useQuery({
    queryKey: ["turmas-livro-publico", id],
    enabled: !isPlaceholder,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("turmas")
        .select(
          "id,nome,data_inicio,data_fim,horario,sala,professor,vagas_max,inscritos,ativo,livro_id,valor",
        )
        .eq("livro_id", id)
        .eq("ativo", true)
        .gte("data_inicio", new Date().toISOString().slice(0, 10))
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((t) => ({ ...t, vagas_restantes: Math.max(Number(t.vagas_max ?? 0) - Number(t.inscritos ?? 0), 0) })) as Turma[];
    },
  });
  const interesse = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Entre na sua conta para registrar seu interesse.");
      const { error } = await (supabase as any)
        .from("lista_interesse_cursos")
        .upsert({ participante_id: user.id, livro_id: id }, { onConflict: "participante_id,livro_id" });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Interesse registrado! Avisaremos quando uma nova turma deste curso for aberta."),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível registrar seu interesse."),
  });

  const inscrever = useMutation({
    mutationFn: async (turma: Turma) => {
      if (!user?.id) throw new Error("Faça login para continuar.");
      const { data: existente, error: consultaError } = await supabase
        .from("inscricoes")
        .select("id,status")
        .eq("participante_id", user.id)
        .eq("turma_id", turma.id)
        .maybeSingle();
      if (consultaError) throw consultaError;
      if (existente) {
        navigate({ to: "/matricula/$inscricaoId", params: { inscricaoId: existente.id } });
        return { id: existente.id, existente: true };
      }
      const status =
        turma.vagas_max > 0 && (turma.vagas_restantes ?? 0) <= 0
          ? "lista_espera"
          : "aguardando_pagamento";
      const { data: insc, error: inscError } = await supabase
        .from("inscricoes")
        .insert({ participante_id: user.id, turma_id: turma.id, livro_id: id, status })
        .select("id")
        .single();
      if (inscError) throw inscError;
      if (status === "aguardando_pagamento") {
        const { error: pagError } = await supabase
          .from("pagamentos")
          .insert({
            inscricao_id: insc.id,
            participante_id: user.id,
            turma_id: turma.id,
            valor: Number(turma.valor ?? 0),
            comprovante_url: null,
            status: "aguardando",
          });
        if (pagError) throw pagError;
      }
      return { id: insc.id, existente: false };
    },
    onSuccess: (res) => {
      toast.success(
        res.existente
          ? "Você já está inscrito nesta turma."
          : "Inscrição realizada! Agora faça o pagamento via PIX.",
      );
      navigate({ to: "/matricula/$inscricaoId", params: { inscricaoId: res.id } });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível realizar a inscrição."),
  });
  const numeroLivro = livro?.ordem ?? (isPlaceholder ? Number(id.replace("placeholder-", "")) : 0);
  const titulo = livro?.titulo ?? (isPlaceholder ? `Livro ${numeroLivro}` : "Livro não encontrado");
  if (erroLivro)
    return (
      <div className="min-h-screen bg-background px-4 py-20 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-5 font-serif text-2xl font-semibold">Não foi possível carregar este curso</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Houve um erro ao consultar as informações do curso. Atualize a página e tente novamente.
        </p>
        <Button asChild className="mt-6 bg-gold text-primary-foreground">
          <Link to="/livros">Voltar para os livros</Link>
        </Button>
      </div>
    );

  if (carregandoLivro)
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="h-8 w-40 rounded bg-muted" />
          <div className="h-96 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  if (!livro && !isPlaceholder)
    return (
      <div className="min-h-screen bg-background px-4 py-20 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-5 font-serif text-3xl font-semibold">Livro não encontrado</h1>
        <Button asChild className="mt-6 bg-gold text-primary-foreground">
          <Link to="/livros">Voltar para os livros</Link>
        </Button>
      </div>
    );
  const BotaoInscricao = ({ turma }: { turma: Turma }) =>
    user ? (
      <Button
        type="button"
        disabled={inscrever.isPending}
        onClick={() => inscrever.mutate(turma)}
        className="w-full bg-gold text-primary-foreground sm:w-auto"
      >
        {inscrever.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Inscreva-se
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    ) : (
      <Button asChild className="w-full bg-gold text-primary-foreground hover:bg-gold/90 sm:w-auto">
        <Link to="/cadastro/$turmaId" params={{ turmaId: turma.id }}>
          Inscreva-se
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    );
  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-3 sm:px-4 md:px-8">
          <Link
            to="/livros"
            className="inline-flex min-w-0 items-center gap-2 text-xs text-foreground/70 hover:text-gold sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Voltar para os livros</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Heart className="h-4 w-4 fill-gold text-gold" />
            <span className="hidden font-serif text-sm font-semibold sm:inline">BOOK TEAM</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl min-w-0 px-3 py-7 sm:px-4 sm:py-10 md:px-8 md:py-14">
        <div className="grid min-w-0 gap-7 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[260px] md:mx-0 md:max-w-none">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-gold/20 bg-muted shadow-premium">
              {livro?.capa_url ? (
                <img
                  src={livro.capa_url}
                  alt={titulo}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-gold" />
                </div>
              )}
              <div className="absolute left-3 top-3 rounded-full border border-gold/30 bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gold">
                Livro {numeroLivro} de 10
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Jornada</span>
                <span>{numeroLivro}/10</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-gold"
                  style={{ width: `${Math.min((numeroLivro / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <Badge variant="outline" className="border-gold/30 text-gold">
              {livro?.categoria || "Jornada"}
            </Badge>
            <h1 className="mt-3 max-w-3xl break-words font-serif text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
              {titulo}
            </h1>
            {livro?.autor && (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <User className="h-4 w-4" />
                {livro.autor}
              </p>
            )}
            {(livro?.descricao || livro?.objetivo || livro?.publico_alvo || livro?.conteudo_programatico || livro?.competencias || livro?.qtd_encontros || livro?.duracao || livro?.material_necessario || livro?.professor || livro?.coordenador || livro?.ano || livro?.datas_curriculo) && (
              <section className="mt-7 space-y-4">
                <h2 className="font-serif text-xl font-semibold sm:text-2xl">Sobre este curso</h2>
                {livro.descricao && <p className="text-sm leading-6 text-muted-foreground">{livro.descricao}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  {livro.objetivo && <div className="rounded-xl border border-border/60 bg-card/50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Objetivo</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{livro.objetivo}</p></div>}
                  {livro.publico_alvo && <div className="rounded-xl border border-border/60 bg-card/50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Público-alvo</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{livro.publico_alvo}</p></div>}
                  {livro.conteudo_programatico && <div className="rounded-xl border border-border/60 bg-card/50 p-4 sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Conteúdo programático</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{livro.conteudo_programatico}</p></div>}
                  {livro.competencias && <div className="rounded-xl border border-border/60 bg-card/50 p-4 sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-gold">Competências</p><p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{livro.competencias}</p></div>}
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  {livro.qtd_encontros != null && <span>Encontros: {livro.qtd_encontros}</span>}
                  {livro.duracao && <span>Duração: {livro.duracao}</span>}
                  {livro.material_necessario && <span>Material necessário: {livro.material_necessario}</span>}
                  {livro.professor && <span>Professor: {livro.professor}</span>}
                  {livro.coordenador && <span>Coordenador: {livro.coordenador}</span>}
                  {livro.ano && <span>Ano: {livro.ano}</span>}
                  {livro.datas_curriculo && <span className="sm:col-span-2">Datas: {livro.datas_curriculo}</span>}
                </div>
              </section>
            )}

            <section className="mt-7">
              <h2 className="font-serif text-xl font-semibold sm:text-2xl">Próximas turmas</h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                As turmas abertas aparecem aqui automaticamente.
              </p>
              {carregandoTurmas && <div className="mt-4 h-28 animate-pulse rounded-xl bg-muted" />}
              {!carregandoTurmas && erroTurmas && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/5 p-5">
                  <p className="text-sm text-red-200">Não foi possível carregar as turmas deste curso.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Atualize a página e tente novamente.</p>
                </div>
              )}
              {!carregandoTurmas && !erroTurmas && !turmas.length && (
                <div className="mt-4 rounded-xl border border-border/60 bg-card/40 p-5">
                  <p className="text-sm text-muted-foreground">Ainda não há turmas disponíveis para este curso.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Registre seu interesse e avisaremos por e-mail quando uma nova turma for aberta.</p>
                  {user ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 gap-2 border-gold/40 hover:border-gold hover:text-gold"
                      onClick={() => interesse.mutate()}
                      disabled={interesse.isPending}
                    >
                      {interesse.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                      Registrar meu interesse
                    </Button>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground">Entre na sua conta para registrar seu interesse.</p>
                  )}
                </div>
              )}
              <div className="mt-4 space-y-3">
                {turmas.map((turma) => (
                  <div key={turma.id} className="rounded-xl border border-border/60 bg-card/60 p-4">
                    <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-serif text-base font-semibold">
                          {turma.nome}
                        </p>
                        <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
                          {turma.data_inicio && (
                            <span>
                              <Calendar className="mr-1 inline h-3.5 w-3.5 text-gold" />
                              Início:{" "}
                              {new Date(`${turma.data_inicio}T00:00:00`).toLocaleDateString(
                                "pt-BR",
                              )}
                            </span>
                          )}
                          {turma.data_fim && (
                            <span>
                              <Calendar className="mr-1 inline h-3.5 w-3.5 text-gold" />
                              Fim:{" "}
                              {new Date(`${turma.data_fim}T00:00:00`).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {turma.horario && (
                            <span>
                              <Clock className="mr-1 inline h-3.5 w-3.5 text-gold" />
                              {turma.horario}
                            </span>
                          )}
                          {turma.sala && (
                            <span>
                              <MapPin className="mr-1 inline h-3.5 w-3.5 text-gold" />
                              {turma.sala}
                            </span>
                          )}
                          {turma.professor && <span>Professor: {turma.professor}</span>}
                          <span>
                            {turma.vagas_max > 0
                              ? `${turma.vagas_restantes ?? 0} vagas restantes`
                              : "Vagas disponíveis"}
                          </span>
                        </div>
                      </div>
                      <BotaoInscricao turma={turma} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
