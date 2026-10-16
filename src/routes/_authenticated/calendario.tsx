import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, BookOpen, CheckCircle2, AlertCircle, Rocket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({ meta: [{ title: "Calendário — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: CalendarioPage,
});

type Evento = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  data: string;
  hora: string | null;
  local: string | null;
  cidade: string | null;
  vagas: number | null;
};

type Lancamento = {
  id: string;
  titulo: string | null;
  descricao: string | null;
  data_lancamento: string;
};

type Inscricao = {
  id: string;
  status: string;
  livro: { id: string; titulo: string | null } | null;
  turma: {
    id: string;
    nome: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    dia_semana: string | null;
    horario: string | null;
    sala: string | null;
  } | null;
};

type Item =
  | { kind: "evento"; id: string; data: string; titulo: string; hora: string | null; evento: Evento }
  | { kind: "lancamento"; id: string; data: string; titulo: string; hora: null; lancamento: Lancamento }
  | { kind: "aula"; id: string; data: string; titulo: string; hora: string | null; inscricao: Inscricao };

type Tipo = Item["kind"];

type Presenca = {
  id: string;
  inscricao_id: string;
  data_aula: string;
  presente: boolean;
  justificativa: string | null;
  falta_justificada: boolean;
};

// Cores: eventos em amarelo, lançamentos de cursos em verde, aulas da turma em vermelho.
const CORES: Record<Tipo, { dot: string; card: string; icone: string; rotulo: string }> = {
  evento: { dot: "bg-yellow-400", card: "border-yellow-400/40 bg-yellow-400/10", icone: "text-yellow-400", rotulo: "Eventos" },
  lancamento: { dot: "bg-green-500", card: "border-green-500/40 bg-green-500/10", icone: "text-green-500", rotulo: "Lançamentos de cursos" },
  aula: { dot: "bg-red-500", card: "border-red-500/40 bg-red-500/10", icone: "text-red-500", rotulo: "Aulas da sua turma" },
};
const TIPOS: Tipo[] = ["aula", "evento", "lancamento"];

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function iso(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function localDate(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function gerarAulas(turma: Inscricao["turma"]) {
  if (!turma?.data_inicio || !turma.data_fim || turma.dia_semana === null || turma.dia_semana === "") return [];
  const dia = Number(turma.dia_semana);
  const out: string[] = [];
  const cursor = localDate(turma.data_inicio);
  const fim = localDate(turma.data_fim);
  while (cursor <= fim) {
    if (cursor.getDay() === dia) out.push(iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function CalendarioPage() {
  const { user } = useAuth();
  const hoje = new Date();
  const hojeIso = iso(hoje);
  const [mes, setMes] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [listaAberta, setListaAberta] = useState<Tipo | null>(null);
  const inicioMes = iso(new Date(mes.getFullYear(), mes.getMonth(), 1));
  const fimMes = iso(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["aluno-calendario-eventos", inicioMes],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("id,titulo,descricao,data,hora,local,cidade,vagas").is("livro_id", null).is("arquivado_em", null).eq("status", "aberto").gte("data", inicioMes).lte("data", fimMes).order("data").order("hora");
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });

  // Datas de lançamento dos cursos. Se a coluna ainda não existir no banco, o calendário segue sem os lançamentos.
  const { data: lancamentos = [] } = useQuery({
    queryKey: ["aluno-calendario-lancamentos", inicioMes],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("livros")
        .select("id,titulo,descricao,data_lancamento")
        .eq("status", "ativo")
        .not("data_lancamento", "is", null)
        .gte("data_lancamento", inicioMes)
        .lte("data_lancamento", fimMes)
        .order("data_lancamento");
      if (error) {
        console.error("Lançamentos de cursos indisponíveis:", error);
        return [] as Lancamento[];
      }
      return (data ?? []) as Lancamento[];
    },
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ["aluno-calendario-presencas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presencas")
        .select("id,inscricao_id,data_aula,presente,justificativa,falta_justificada")
        .eq("participante_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  const { data: inscricoes = [] } = useQuery({
    queryKey: ["aluno-calendario-turmas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,livro:livros(id,titulo),turma:turmas(id,nome,data_inicio,data_fim,dia_semana,horario,sala)")
        .eq("participante_id", user!.id)
        .eq("status", "confirmada");
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const itens = useMemo<Item[]>(() => {
    const result: Item[] = eventos.map((e) => ({
      kind: "evento",
      id: "evento-" + e.id,
      data: e.data,
      titulo: e.titulo || "Evento",
      hora: e.hora,
      evento: e,
    }));
    for (const l of lancamentos) {
      result.push({
        kind: "lancamento",
        id: "lancamento-" + l.id,
        data: l.data_lancamento,
        titulo: l.titulo || "Curso",
        hora: null,
        lancamento: l,
      });
    }
    // Aulas só das turmas em que o aluno está inscrito (inscrição confirmada).
    for (const inscricao of inscricoes) {
      for (const data of gerarAulas(inscricao.turma)) {
        if (data >= inicioMes && data <= fimMes) {
          result.push({
            kind: "aula",
            id: "aula-" + inscricao.id + "-" + data,
            data,
            titulo: inscricao.livro?.titulo || "Aula",
            hora: inscricao.turma?.horario || null,
            inscricao,
          });
        }
      }
    }
    return result.sort((a, b) => (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  }, [eventos, lancamentos, inscricoes, inicioMes, fimMes]);

  const porDia = useMemo(() => {
    const mapa = new Map<string, Item[]>();
    for (const item of itens) {
      const list = mapa.get(item.data) ?? [];
      list.push(item);
      mapa.set(item.data, list);
    }
    return mapa;
  }, [itens]);

  const itensDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];
  const itensDaLista = listaAberta ? itens.filter((i) => i.kind === listaAberta) : [];
  const presencaDoDia = (inscricaoId: string, data: string) =>
    presencas.find((p) => p.inscricao_id === inscricaoId && p.data_aula === data);

  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return [...Array.from({ length: primeiro.getDay() }, () => null), ...Array.from({ length: totalDias }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))];
  }, [mes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Calendário</h1>
        <p className="text-sm text-muted-foreground">Eventos, lançamentos de cursos e as aulas da sua turma. Toque em um dia marcado para ver os detalhes.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <p className="font-serif text-lg font-semibold">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>
            <Button size="icon" variant="ghost" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">{DIAS.map((d) => <div key={d} className="py-1.5">{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celulas.map((dia, idx) => {
              if (!dia) return <div key={"v-"+idx} className="h-12 rounded-md bg-muted/10 sm:h-16" />;
              const key = iso(dia);
              const doDia = porDia.get(key) ?? [];
              const eHoje = key === hojeIso;
              const tipos = new Set(doDia.map((i) => i.kind));
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => doDia.length > 0 && setDiaSelecionado(key)}
                  className={"h-12 rounded-md border p-1 text-left transition-colors sm:h-16 sm:p-1.5 " +
                    (doDia.length ? "cursor-pointer hover:border-gold/50 hover:bg-gold/5" : "cursor-default") +
                    " " + (eHoje ? "border-primary bg-primary/5" : "border-border/50")}
                >
                  <span className={"text-xs " + (eHoje ? "font-semibold text-primary" : "text-muted-foreground")}>{dia.getDate()}</span>
                  {doDia.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {TIPOS.filter((t) => tipos.has(t)).map((t) => (
                        <span key={t} className={`h-2 w-2 rounded-full ${CORES[t].dot}`} title={CORES[t].rotulo} />
                      ))}
                      <span className="text-[9px] text-muted-foreground">{doDia.length}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legenda: cada item abre a lista do mês daquele tipo */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {TIPOS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setListaAberta(t)}
                className="flex min-h-9 items-center gap-2 rounded-md border border-border px-3 py-1.5 hover:bg-secondary"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${CORES[t].dot}`} />
                {CORES[t].rotulo}
              </button>
            ))}
          </div>
          {isLoading && <p className="mt-3 text-sm text-muted-foreground">Carregando calendário...</p>}
        </CardContent>
      </Card>

      {inscricoes.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <Button asChild variant="outline" size="sm"><Link to="/presenca">Ver presença e justificar faltas</Link></Button>
        </div>
      )}

      {/* Lista do mês por tipo */}
      <Dialog open={!!listaAberta} onOpenChange={(open) => !open && setListaAberta(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{listaAberta ? CORES[listaAberta].rotulo : ""} — {MESES[mes.getMonth()]}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {itensDaLista.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setListaAberta(null); setDiaSelecionado(item.data); }}
                className={`w-full rounded-lg border p-3 text-left ${CORES[item.kind].card}`}
              >
                <p className="text-xs text-muted-foreground">{localDate(item.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}{item.hora ? " · " + item.hora.slice(0, 5) : ""}</p>
                <p className="font-medium">{item.titulo}</p>
              </button>
            ))}
            {itensDaLista.length === 0 && <p className="text-sm text-muted-foreground">Nada deste tipo neste mês.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detalhes do dia */}
      <Dialog open={!!diaSelecionado} onOpenChange={(open) => !open && setDiaSelecionado(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {diaSelecionado ? localDate(diaSelecionado).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "Agenda do dia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {itensDoDia.map((item) => {
              if (item.kind === "evento") {
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${CORES.evento.card}`}>
                    <div className="flex items-start gap-3">
                      <CalendarDays className={`mt-0.5 h-5 w-5 shrink-0 ${CORES.evento.icone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Evento</p>
                        <p className="mt-1 text-base font-medium">{item.titulo}</p>
                        {item.evento.descricao && <p className="mt-1 text-sm text-muted-foreground">{item.evento.descricao}</p>}
                        {item.hora && <p className="mt-2 flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {item.hora.slice(0,5)}</p>}
                        {(item.evento.local || item.evento.cidade) && <p className="mt-1 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" /> {[item.evento.local, item.evento.cidade].filter(Boolean).join(" — ")}</p>}
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.kind === "lancamento") {
                return (
                  <div key={item.id} className={`rounded-xl border p-4 ${CORES.lancamento.card}`}>
                    <div className="flex items-start gap-3">
                      <Rocket className={`mt-0.5 h-5 w-5 shrink-0 ${CORES.lancamento.icone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Lançamento do curso</p>
                        <p className="mt-1 text-base font-medium">{item.titulo}</p>
                        {item.lancamento.descricao && <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{item.lancamento.descricao}</p>}
                      </div>
                    </div>
                  </div>
                );
              }

              const registro = diaSelecionado ? presencaDoDia(item.inscricao.id, diaSelecionado) : undefined;
              return (
                <div key={item.id} className={`rounded-xl border p-4 ${CORES.aula.card}`}>
                  <div className="flex items-start gap-3">
                    <BookOpen className={`mt-0.5 h-5 w-5 shrink-0 ${CORES.aula.icone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Aula da sua turma</p>
                      <p className="mt-1 text-base font-medium">{item.titulo}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.inscricao.turma?.nome || "Turma"}</p>
                      {item.hora && <p className="mt-2 flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> {item.hora.slice(0,5)}</p>}
                      {registro?.presente && <p className="mt-2 flex items-center gap-2 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> Presente</p>}
                      {registro && !registro.presente && (
                        <div className="mt-3 space-y-2">
                          <p className="flex items-center gap-2 text-sm text-red-500"><AlertCircle className="h-4 w-4" /> Ausente</p>
                          {registro.falta_justificada ? (
                            <p className="text-xs text-muted-foreground">Justificativa enviada: {registro.justificativa}</p>
                          ) : (
                            <Button asChild size="sm" className="w-full sm:w-auto">
                              <Link to="/presenca">Justificar falta</Link>
                            </Button>
                          )}
                        </div>
                      )}
                      {!registro && <p className="mt-2 text-xs text-muted-foreground">Presença ainda não lançada.</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            {itensDoDia.length === 0 && <p className="text-sm text-muted-foreground">Não há itens neste dia.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
