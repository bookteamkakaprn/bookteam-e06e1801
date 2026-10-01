import { useMemo, useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, CalendarDays, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";
import { emailFaltaJustificar } from "@/lib/email-service";

export const Route = createFileRoute("/_admin/admin/presencas")({
  head: () => ({ meta: [{ title: "Lista de Presença — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PresencaPage,
});

type Turma = { id: string; nome: string | null; data_inicio: string | null; data_fim: string | null; dia_semana: string | null; horario: string | null; frequencia_minima: number | null };
type Inscricao = { id: string; status: string; participante: { id: string; nome: string | null; email: string | null } | null; livro: { id: string; titulo: string | null } | null; turma: Turma | null };
type Presenca = { id: string; inscricao_id: string; participante_id: string; turma_id: string | null; data_aula: string; presente: boolean; justificativa: string | null; falta_justificada: boolean };

const DIAS = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const iso = (d: Date) => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
const localDate = (v: string) => { const [y,m,d]=v.split("-").map(Number); return new Date(y,m-1,d); };
const dataBR = (v: string) => localDate(v).toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"});
const gerarAulas = (t: Turma | null) => {
  if (!t?.data_inicio || !t.data_fim || t.dia_semana === null || t.dia_semana === "") return [];
  const out: string[] = []; const cursor = localDate(t.data_inicio); const fim = localDate(t.data_fim); const dia = Number(t.dia_semana);
  while (cursor <= fim) { if (cursor.getDay() === dia) out.push(iso(cursor)); cursor.setDate(cursor.getDate()+1); }
  return out;
};

function PresencaPage() {
  const qc = useQueryClient();
  const [filtroTurma, setFiltroTurma] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState("");
  const [mesVisualizado, setMesVisualizado] = useState("");
  const [detalhe, setDetalhe] = useState<Presenca | null>(null);

  const inscricoesQ = useQuery({
    queryKey: ["admin-presenca-inscricoes-semanais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inscricoes").select("id,status,participante:participantes(id,nome,email),livro:livros(id,titulo),turma:turmas(id,nome,data_inicio,data_fim,dia_semana,horario,frequencia_minima)").eq("status","confirmada").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });
  const presencasQ = useQuery({
    queryKey: ["admin-presenca-registros-semanais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("presencas").select("id,inscricao_id,participante_id,turma_id,data_aula,presente,justificativa,falta_justificada");
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  const inscricoes = inscricoesQ.data ?? [];
  const presencas = presencasQ.data ?? [];
  const turmas = useMemo(() => {
    const map = new Map<string, Turma>();
    for (const i of inscricoes) if (i.turma?.id) map.set(i.turma.id, i.turma);
    return [...map.values()];
  }, [inscricoes]);
  const turma = turmas.find((t) => t.id === filtroTurma) ?? null;
  const diasAula = useMemo(() => gerarAulas(turma), [turma]);
  const dataAtual = dataSelecionada && diasAula.includes(dataSelecionada) ? dataSelecionada : "";

  useEffect(() => {
    if (!turma) return;
    const inicio = turma.data_inicio ? localDate(turma.data_inicio) : null;
    if (inicio) {
      setMesVisualizado(`${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}`);
      setDataSelecionada(diasAula[0] ?? "");
    }
  }, [filtroTurma, diasAula]);

  const mesBase = mesVisualizado
    ? localDate(`${mesVisualizado}-01`)
    : (turma?.data_inicio ? localDate(turma.data_inicio) : new Date());
  const inicioGrade = new Date(mesBase.getFullYear(), mesBase.getMonth(), 1 - mesBase.getDay());
  const diasCalendario = Array.from({ length: 42 }, (_, index) => {
    const d = new Date(inicioGrade);
    d.setDate(inicioGrade.getDate() + index);
    return d;
  });
  const aulasDoMes = diasAula.filter((d) =>
    d.startsWith(`${mesBase.getFullYear()}-${String(mesBase.getMonth() + 1).padStart(2, "0")}`)
  );
  const mesAnterior = new Date(mesBase.getFullYear(), mesBase.getMonth() - 1, 1);
  const proximoMes = new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1);
  const navegarMes = (mes: Date) => {
    const chave = `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`;
    setMesVisualizado(chave);
    const primeiraAula = diasAula.find((d) => d.startsWith(chave));
    setDataSelecionada(primeiraAula ?? "");
  };

  const alunos = inscricoes.filter((i) => i.turma?.id === filtroTurma);
  const registro = (inscricaoId: string, data: string) => presencas.find((p) => p.inscricao_id === inscricaoId && p.data_aula === data);
  const presentes = alunos.filter((i) => registro(i.id,dataAtual)?.presente).length;
  const ausentes = alunos.filter((i) => { const p=registro(i.id,dataAtual); return p && !p.presente; }).length;

  const marcar = useMutation({
    mutationFn: async ({ inscricao, presente }: { inscricao: Inscricao; presente: boolean }) => {
      const participanteId = inscricao.participante?.id;
      const turmaId = inscricao.turma?.id;
      if (!participanteId || !turmaId || !dataAtual) throw new Error("Dados da aula incompletos.");
      const atual = registro(inscricao.id,dataAtual);
      const payload = { inscricao_id: inscricao.id, participante_id: participanteId, turma_id: turmaId, data_aula: dataAtual, presente, horario_checkin: presente ? new Date().toISOString() : null };
      if (atual) {
        const { error } = await supabase.from("presencas").update(payload as never).eq("id",atual.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("presencas").insert(payload as never);
        if (error) throw error;
      }
      if (!presente && inscricao.participante?.email) {
        try {
          await emailFaltaJustificar(inscricao.participante.email, inscricao.participante.nome || "Aluno(a)", inscricao.livro?.titulo || "Curso", inscricao.turma?.nome || "Turma", dataAtual);
        } catch (e) { console.error("Email de falta não enviado", e); }
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.presente ? "Presença registrada." : "Ausência registrada. O aluno recebeu e-mail para justificar.");
      qc.invalidateQueries({ queryKey: ["admin-presenca-registros-semanais"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao registrar presença."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Lista de Presença</h1>
        <p className="text-sm text-muted-foreground">A turma usa a data de início, fim, dia da semana e horário cadastrados para gerar automaticamente cada aula semanal.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-sm font-medium">Turma</label>
          <select className="mt-1 h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm" value={filtroTurma} onChange={(e)=>{setFiltroTurma(e.target.value);setDataSelecionada("");}}>
            <option value="">Selecione uma turma</option>
            {turmas.map((t)=><option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </CardContent>
      </Card>

      {turma && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3"><CalendarDays className="h-5 w-5 text-gold" />{turma.nome}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {turma.data_inicio ? localDate(turma.data_inicio).toLocaleDateString("pt-BR") : "—"} até {turma.data_fim ? localDate(turma.data_fim).toLocaleDateString("pt-BR") : "—"} · {turma.dia_semana !== null && turma.dia_semana !== "" ? DIAS[Number(turma.dia_semana)] : "dia não configurado"} {turma.horario ? "· " + turma.horario.slice(0,5) : ""}
              </p>
            </CardHeader>
            <CardContent>
              {diasAula.length === 0 ? <p className="text-sm text-muted-foreground">Configure início, fim e dia da semana em Turmas.</p> : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button size="icon" variant="outline" onClick={() => navegarMes(mesAnterior)} aria-label="Mês anterior">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-lg font-bold capitalize">
                      {mesBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </div>
                    <Button size="icon" variant="outline" onClick={() => navegarMes(proximoMes)} aria-label="Próximo mês">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-7 bg-muted/40 border-b">
                      {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((dia) => (
                        <div key={dia} className="py-2 text-center text-xs font-semibold text-muted-foreground">{dia}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7">
                      {diasCalendario.map((dia) => {
                        const chave = iso(dia);
                        const ehDoMes = dia.getMonth() === mesBase.getMonth();
                        const ehAula = diasAula.includes(chave);
                        const selecionada = chave === dataAtual;
                        const temRegistros = ehAula && alunos.some((aluno) => registro(aluno.id, chave));
                        return (
                          <button
                            key={chave}
                            type="button"
                            disabled={!ehAula}
                            onClick={() => ehAula && setDataSelecionada(chave)}
                            className={`min-h-[58px] border-b border-r p-2 text-center transition-colors ${ehAula ? "cursor-pointer hover:bg-primary/10" : "cursor-default"} ${!ehDoMes ? "opacity-35" : ""} ${selecionada ? "bg-primary/10" : ""}`}
                          >
                            <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${selecionada ? "bg-primary text-primary-foreground" : ehAula ? "border-2 border-green-500 text-green-700" : "text-foreground"}`}>
                              {dia.getDate()}
                            </span>
                            {ehAula && <span className={`mt-1 block text-[10px] ${temRegistros ? "font-semibold text-primary" : "text-green-600"}`}>{temRegistros ? "lançada" : "aula"}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-green-500" /> Dia de aula</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-primary" /> Dia selecionado</span>
                    <span>{aulasDoMes.length} aula(s) neste mês</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Clique no dia de aula no calendário para lançar a presença. Depois marque <strong>Presente</strong> ou <strong>Ausente</strong> para cada aluno.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {dataAtual && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Alunos</p><p className="text-2xl font-bold">{alunos.length}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Presentes</p><p className="text-2xl font-bold text-green-600">{presentes}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Ausentes</p><p className="text-2xl font-bold text-red-600">{ausentes}</p></CardContent></Card>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[760px] text-sm">
                  <thead><tr className="border-b bg-card/40"><th className="px-4 py-3 text-left">Aluno</th><th className="px-4 py-3 text-left">Curso</th><th className="px-4 py-3 text-center">Presença — {dataBR(dataAtual)}</th><th className="px-4 py-3 text-center">Justificativa</th></tr></thead>
                  <tbody>
                    {alunos.map((i)=>{
                      const p=registro(i.id,dataAtual);
                      return <tr key={i.id} className="border-b border-border/30">
                        <td className="px-4 py-3"><p className="font-medium">{i.participante?.nome || "Aluno"}</p><p className="text-xs text-muted-foreground">{i.participante?.email}</p></td>
                        <td className="px-4 py-3">{i.livro?.titulo}</td>
                        <td className="px-4 py-3"><div className="flex justify-center gap-2">
                          <Button size="sm" variant={p?.presente ? "default" : "outline"} onClick={()=>marcar.mutate({inscricao:i,presente:true})}><CheckCircle2 className="mr-1 h-4 w-4"/>Presente</Button>
                          <Button size="sm" variant={p && !p.presente ? "destructive" : "outline"} onClick={()=>marcar.mutate({inscricao:i,presente:false})}><XCircle className="mr-1 h-4 w-4"/>Ausente</Button>
                        </div></td>
                        <td className="px-4 py-3 text-center">{p?.justificativa ? <Button size="sm" variant="ghost" onClick={()=>setDetalhe(p)}><Eye className="mr-1 h-4 w-4"/>Ver justificativa</Button> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={!!detalhe} onOpenChange={(open)=>!open&&setDetalhe(null)}>
        <DialogContent><DialogHeader><DialogTitle>Justificativa de falta</DialogTitle></DialogHeader>{detalhe && <div className="space-y-3"><p className="text-sm">Aula: <strong>{dataBR(detalhe.data_aula)}</strong></p><Badge variant={detalhe.falta_justificada?"secondary":"destructive"}>{detalhe.falta_justificada?"Justificada":"Enviada pelo aluno"}</Badge><p className="rounded-md border bg-muted/20 p-4 text-sm whitespace-pre-wrap">{detalhe.justificativa}</p></div>}</DialogContent>
      </Dialog>
    </div>
  );
}
