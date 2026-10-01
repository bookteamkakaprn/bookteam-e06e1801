import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, CalendarDays, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { emailFaltaJustificar } from "@/lib/email-service";

export const Route = createFileRoute("/_authenticated/presenca")({
  head: () => ({ meta: [{ title: "Presença — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: PresencaPage,
});

type Turma = {
  id: string;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  dia_semana: string | null;
  horario: string | null;
  frequencia_minima?: number | null;
};

type Inscricao = {
  id: string;
  livro: { id: string; titulo: string | null } | null;
  turma: Turma | null;
  participante: { email: string | null; nome: string | null } | null;
};

type Presenca = {
  id: string;
  inscricao_id: string;
  data_aula: string;
  presente: boolean;
  justificativa: string | null;
  falta_justificada: boolean;
};

const DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function iso(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function localDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function dataBR(value: string) {
  return localDate(value).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}
function gerarAulas(turma: Turma | null) {
  if (!turma?.data_inicio || !turma?.data_fim || turma.dia_semana === null || turma.dia_semana === "") return [];
  const dia = Number(turma.dia_semana);
  const inicio = localDate(turma.data_inicio);
  const fim = localDate(turma.data_fim);
  const out: string[] = [];
  const cursor = new Date(inicio);
  while (cursor <= fim) {
    if (cursor.getDay() === dia) out.push(iso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function PresencaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [justificando, setJustificando] = useState<{ presenca: Presenca; inscricao: Inscricao } | null>(null);
  const [texto, setTexto] = useState("");

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["inscricoes-presenca-semanal", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("id,status,livro:livros(id,titulo),turma:turmas(id,nome,data_inicio,data_fim,dia_semana,horario,frequencia_minima),participante:participantes(email,nome)")
        .eq("participante_id", user!.id)
        .eq("status", "confirmada")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Inscricao[];
    },
  });

  const inscricaoIds = inscricoes.map((i) => i.id);
  const { data: presencas = [] } = useQuery({
    queryKey: ["minhas-presencas-semanais", user?.id, inscricaoIds.join(",")],
    enabled: !!user?.id && inscricaoIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presencas")
        .select("id,inscricao_id,data_aula,presente,justificativa,falta_justificada")
        .in("inscricao_id", inscricaoIds);
      if (error) throw error;
      return (data ?? []) as Presenca[];
    },
  });

  const justificar = useMutation({
    mutationFn: async () => {
      if (!justificando) throw new Error("Selecione a falta.");
      const justificativa = texto.trim();
      if (!justificativa) throw new Error("Informe o motivo da falta.");
      const { error } = await (supabase.from("presencas") as any)
        .update({ justificativa, falta_justificada: true })
        .eq("id", justificando.presenca.id)
        .eq("participante_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Justificativa enviada ao ADM.");
      setJustificando(null);
      setTexto("");
      qc.invalidateQueries({ queryKey: ["minhas-presencas-semanais"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível enviar a justificativa."),
  });

  if (isLoading) return <Card><CardContent className="p-6"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Carregando presença...</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Presença</h1>
        <p className="text-sm text-muted-foreground">Acompanhe cada aula e justifique uma falta diretamente pelo dia.</p>
      </div>

      {inscricoes.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">Quando sua vaga for confirmada, o calendário de aulas aparecerá aqui.</CardContent></Card>
      )}

      {inscricoes.map((inscricao) => {
        const aulas = gerarAulas(inscricao.turma);
        const registros = presencas.filter((p) => p.inscricao_id === inscricao.id);
        const hoje = new Date();
        const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const aulasConcluidas = aulas.filter((data) => localDate(data) <= hojeSemHora);
        const presente = registros.filter((p) => p.presente && aulasConcluidas.includes(p.data_aula)).length;
        const percentual = aulasConcluidas.length > 0 ? Math.round((presente / aulasConcluidas.length) * 100) : 100;
        const minimo = inscricao.turma?.frequencia_minima ?? 90;

        return (
          <Card key={inscricao.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                <span>{inscricao.livro?.titulo ?? "Curso"}</span>
                <Badge variant={percentual >= minimo ? "secondary" : "destructive"}>{percentual}% de frequência</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {inscricao.turma?.nome ?? "Turma"} · {aulas.length} aula(s) · mínimo {minimo}%
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {aulas.length === 0 ? (
                <p className="text-sm text-muted-foreground">A turma ainda não tem data de início, fim e dia da semana configurados.</p>
              ) : (
                aulas.map((dataAula, index) => {
                  const registro = registros.find((p) => p.data_aula === dataAula);
                  const passado = localDate(dataAula) <= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
                  return (
                    <div key={dataAula} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{index + 1}. {dataBR(dataAula)}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" /> {DIAS[localDate(dataAula).getDay()]}
                          {inscricao.turma?.horario ? <><Clock className="ml-2 h-3.5 w-3.5" /> {String(inscricao.turma.horario).slice(0, 5)}</> : null}
                        </p>
                        {registro?.justificativa && <p className="mt-1 text-xs text-muted-foreground">Justificativa: {registro.justificativa}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {registro?.presente ? (
                          <Badge className="gap-1 bg-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Presente</Badge>
                        ) : registro ? (
                          <>
                            <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3.5 w-3.5" /> Ausente</Badge>
                            <Button size="sm" variant="outline" onClick={() => { setJustificando({ presenca: registro, inscricao }); setTexto(registro.justificativa ?? ""); }}>
                              {registro.falta_justificada ? "Editar justificativa" : "Justificar falta"}
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary">{passado ? "Aguardando lançamento" : "Aula futura"}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!justificando} onOpenChange={(open) => { if (!open) { setJustificando(null); setTexto(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Justificar falta</DialogTitle></DialogHeader>
          {justificando && (
            <div className="space-y-4">
              <p className="text-sm">Aula: <strong>{dataBR(justificando.presenca.data_aula)}</strong></p>
              <Textarea placeholder="Informe o motivo da falta..." value={texto} onChange={(e) => setTexto(e.target.value)} />
              <Button onClick={() => justificar.mutate()} disabled={justificar.isPending || !texto.trim()} className="w-full">
                {justificar.isPending ? "Enviando..." : "Enviar justificativa"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
