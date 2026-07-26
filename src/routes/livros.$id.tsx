import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Calendar, Lock, MapPin, Users } from "lucide-react";
import { BlocoTexto, GradeInfo } from "@/components/livro/ficha-livro";
import { conclusaoValida, dataLimiteConclusao, LIMITE_MESES } from "@/lib/prerequisito";

export const Route = createFileRoute("/livros/$id")({
  head: () => ({
    meta: [
      { title: "Livro — Book Team" },
      { name: "description", content: "Detalhes do livro, próximos encontros, vagas e inscrição." },
      { property: "og:title", content: "Livro — Book Team" },
      { property: "og:description", content: "Detalhes do livro, próximos encontros, vagas e inscrição." },
    ],
  }),
  component: LivroPage,
});

function LivroPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["livro", id, user?.id ?? "anon"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const livroRes = await supabase.from("livros").select("*").eq("id", id).maybeSingle();
      if (livroRes.error) throw livroRes.error;
      const livro = livroRes.data;
      if (!livro) return { livro: null, trilha: null, eventos: [], prereq: null, prereqOk: true };

      const [trilhaRes, eventosRes, prereqRes] = await Promise.all([
        supabase.from("trilhas").select("id, nome").eq("id", livro.trilha_id).maybeSingle(),
        supabase
          .from("eventos")
          .select("*")
          .eq("livro_id", id)
          .eq("status", "aberto")
          .gte("data", today)
          .order("data"),
        livro.ordem > 1
          ? supabase
              .from("livros")
              .select("id, titulo, ordem")
              .eq("trilha_id", livro.trilha_id)
              .eq("ordem", livro.ordem - 1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const turmasRes = await supabase
        .from("turmas")
        .select("*")
        .eq("livro_id", id)
        .order("created_at");

      let prereqOk = true;
      let prereqManualVencido = false;
      const prereq = prereqRes.data ?? null;
      if (prereq && user) {
        const { count } = await supabase
          .from("presencas")
          .select("id, eventos!inner(livro_id)", { count: "exact", head: true })
          .eq("participante_id", user.id)
          .eq("presente", true)
          .eq("eventos.livro_id", prereq.id);
        prereqOk = (count ?? 0) > 0;
        if (!prereqOk) {
          // Conclusão registrada manualmente pelo aluno (data retroativa):
          // só libera se ocorreu dentro do prazo de validade da trilha.
          const { data: manual } = await supabase
            .from("historico_livros")
            .select("data_conclusao")
            .eq("participante_id", user.id)
            .eq("livro_id", prereq.id)
            .maybeSingle();
          if (manual?.data_conclusao) {
            prereqOk = conclusaoValida(manual.data_conclusao);
            prereqManualVencido = !prereqOk;
          }
        }
      } else if (prereq && !user) {
        prereqOk = false;
      }

      return {
        livro,
        trilha: trilhaRes.data,
        eventos: eventosRes.data ?? [],
        turmas: turmasRes.data ?? [],
        prereq,
        prereqOk,
        prereqManualVencido,
      };
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Carregando livro…</div>;
  }
  if (error || !data?.livro) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <p className="text-muted-foreground">Livro não encontrado.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/">Voltar</Link>
        </Button>
      </div>
    );
  }

  const { livro, trilha, eventos, turmas, prereq, prereqOk, prereqManualVencido } = data;
  const bloqueado = !!prereq && !prereqOk;
  const vagasRestantes = livro.vagas_restantes ?? 0;
  const esgotado = (livro.vagas_total ?? 0) > 0 && vagasRestantes <= 0;
  const proximoEvento = eventos[0];
  const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          {livro.imagem_url ? (
            <img src={livro.imagem_url} alt={livro.titulo} className="h-80 w-full max-w-[220px] rounded-md object-cover shadow-book" />
          ) : (
            <div className="flex h-80 w-full max-w-[220px] items-center justify-center rounded-md bg-muted">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div>
            {trilha && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{trilha.nome} · Livro {livro.ordem}</p>
            )}
            <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">{livro.titulo}</h1>
            {livro.autor && <p className="mt-1 text-sm text-muted-foreground">{livro.autor}</p>}
            {livro.descricao && (
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-foreground/75">{livro.descricao}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {livro.valor != null && (
                <Badge variant="secondary" className="text-sm">{moeda(Number(livro.valor))}</Badge>
              )}
              {(livro.vagas_total ?? 0) > 0 && (
                <Badge variant="outline" className="text-sm">
                  {esgotado ? "0 vagas" : `${vagasRestantes} de ${livro.vagas_total} vagas`}
                </Badge>
              )}
              {esgotado ? (
                <Button size="lg" disabled className="uppercase tracking-wide">
                  Turma esgotada
                </Button>
              ) : bloqueado ? (
                <Button size="lg" disabled className="gap-2 uppercase tracking-wide">
                  <Lock className="h-4 w-4" /> Bloqueado
                </Button>
              ) : !user ? (
                <Button asChild size="lg" className="bg-gold uppercase tracking-wide text-primary-foreground hover:bg-gold/90">
                  <Link to="/auth">Quero participar</Link>
                </Button>
              ) : proximoEvento ? (
                <Button asChild size="lg" className="bg-gold uppercase tracking-wide text-primary-foreground hover:bg-gold/90">
                  <Link to="/inscricao/$eventoId" params={{ eventoId: proximoEvento.id }}>Quero participar</Link>
                </Button>
              ) : null}
            </div>

            {bloqueado && (
              <div className="mt-6 flex items-start gap-3 rounded-md border border-gold/40 bg-gold/10 p-4 text-sm">
                <Lock className="mt-0.5 h-4 w-4 text-gold" />
                <div>
                  <p className="font-semibold text-foreground">Pré-requisito pendente</p>
                  {prereqManualVencido ? (
                    <p className="text-foreground/75">
                      Sua conclusão de {prereq ? `"${prereq.titulo}"` : "livro anterior"} é anterior a{" "}
                      {new Date(dataLimiteConclusao() + "T00:00:00").toLocaleDateString("pt-BR")} — passou do prazo de{" "}
                      {LIMITE_MESES / 12} ano. É necessário recomeçar a trilha.
                    </p>
                  ) : (
                    <p className="text-foreground/75">
                      Para se inscrever neste livro, é preciso ter concluído o livro anterior
                      {prereq ? ` — "${prereq.titulo}"` : ""}. Se você já fez esse livro, registre a conclusão com a data
                      retroativa em <span className="font-medium text-foreground">Área do aluno → Meu histórico</span> (válido
                      por até {LIMITE_MESES / 12} ano).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        {turmas.length > 0 && (
          <div className="mb-10">
            <h2 className="font-serif text-xl font-semibold">Turmas</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {turmas.map((t) => {
                const esgotada = t.vagas_max > 0 && (t.vagas_restantes ?? 0) <= 0;
                return (
                  <Card key={t.id}>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-serif text-lg font-semibold">{t.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {[t.temporada, t.ano].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {esgotada ? (
                          <Badge variant="destructive">ESGOTADO</Badge>
                        ) : (
                          <Badge variant="secondary">{t.vagas_restantes} vagas</Badge>
                        )}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        {[
                          { label: "Início", value: t.data_inicio ? new Date(t.data_inicio + "T00:00:00").toLocaleDateString("pt-BR") : null },
                          { label: "Término", value: t.data_fim ? new Date(t.data_fim + "T00:00:00").toLocaleDateString("pt-BR") : null },
                          { label: "Horário", value: t.horario },
                          { label: "Professor", value: t.professor },
                          { label: "Coordenador", value: t.coordenador },
                          { label: "Staff", value: t.staff },
                          { label: "Sala", value: t.sala },
                          { label: "Valor", value: t.valor != null ? moeda(Number(t.valor)) : null },
                          { label: "Vagas", value: t.vagas_max || null },
                          { label: "Inscritos", value: t.inscritos },
                        ]
                          .filter((i) => i.value !== null && i.value !== undefined && String(i.value) !== "")
                          .map((i) => (
                            <div key={i.label} className="min-w-0">
                              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{i.label}</dt>
                              <dd className="truncate text-foreground">{String(i.value)}</dd>
                            </div>
                          ))}
                      </dl>
                      <Button
                        asChild={!bloqueado}
                        disabled={bloqueado}
                        className={
                          esgotada
                            ? "w-full"
                            : "w-full bg-gold text-primary-foreground hover:bg-gold/90"
                        }
                        variant={esgotada ? "outline" : "default"}
                      >
                        {bloqueado ? (
                          <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4" /> Bloqueado</span>
                        ) : (
                          <Link to="/cadastro/$turmaId" params={{ turmaId: t.id }}>
                            {esgotada ? "Entrar na lista de espera" : "Quero participar"}
                          </Link>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-10 space-y-4">
          <GradeInfo
            itens={[
              { label: "Categoria", value: livro.categoria },
              { label: "Autor", value: livro.autor },
              { label: "Ordem da trilha", value: livro.ordem },
              { label: "Professor responsável", value: livro.professor },
              { label: "Coordenador", value: livro.coordenador },
              { label: "Ano", value: livro.ano },
              { label: "Turma", value: livro.turma },
              { label: "Datas do curso", value: livro.datas_curso },
              { label: "Horário", value: livro.horario },
              { label: "Sala", value: livro.sala },
              { label: "Encontros", value: livro.qtd_encontros },
              { label: "Duração", value: livro.duracao },
              { label: "Valor", value: livro.valor != null ? moeda(Number(livro.valor)) : null },
              { label: "Vagas", value: livro.vagas_total || null },
              { label: "Inscritos", value: livro.inscritos },
              { label: "Vagas restantes", value: esgotado ? "Turma esgotada" : vagasRestantes },
              { label: "Status", value: livro.status },
            ]}
          />
          <BlocoTexto titulo="Objetivo" texto={livro.objetivo} />
          <BlocoTexto titulo="Público-alvo" texto={livro.publico_alvo} />
          <BlocoTexto titulo="Conteúdo programático" texto={livro.conteudo_programatico} />
          <BlocoTexto titulo="Competências desenvolvidas" texto={livro.competencias} />
          <BlocoTexto titulo="Material necessário" texto={livro.material_necessario} />
        </div>

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
                  {!user ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to="/auth">Entre para se inscrever</Link>
                    </Button>
                  ) : bloqueado ? (
                    <Button size="sm" disabled className="gap-1">
                      <Lock className="h-3.5 w-3.5" /> Bloqueado
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90">
                      <Link to="/inscricao/$eventoId" params={{ eventoId: e.id }}>Inscreva-se agora</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {eventos.length === 0 && (
            <p className="text-sm text-muted-foreground">Ainda não há encontros abertos para este livro.</p>
          )}
        </div>
      </section>
    </div>
  );
}