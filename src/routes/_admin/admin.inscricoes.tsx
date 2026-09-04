import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Clock, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/inscricoes")({
  head: () => ({ meta: [{ title: "Aprovar inscrições — Admin — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: AdminInscricoes,
});

type Inscricao = { id: string; status: string; created_at: string; participante: { id: string; nome: string | null; email: string | null; status: string } | null; livro: { titulo: string | null; autor: string | null } | null; turma: { nome: string | null; data_inicio: string | null; data_fim: string | null } | null; };
function dataBR(v: string | null) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—"; }

function AdminInscricoes() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-inscricoes"], queryFn: async () => { const { data, error } = await supabase.from("inscricoes").select("id,status,created_at,participante:participantes(id,nome,email,status),livro:livros(titulo,autor),turma:turmas(nome,data_inicio,data_fim)").eq("status", "confirmada").order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as unknown as Inscricao[]; } });
  const liberar = useMutation({
    mutationFn: async (inscricao: Inscricao) => {
      const participanteId = inscricao.participante?.id;
      if (!participanteId) throw new Error("Aluno não encontrado.");
      const { error } = await supabase.from("participantes").update({ status: "participando" }).eq("id", participanteId);
      if (error) throw error;
      const livro = inscricao.livro?.titulo ?? "Book Team";
      const { error: notificationError } = await supabase.from("notificacoes").insert({ participante_id: participanteId, assunto: "Você pode iniciar sua jornada!", canal: "sistema", mensagem: `Seu pagamento foi aprovado e sua inscrição em ${livro} está confirmada. Você já pode iniciar sua jornada.`, enviada: false });
      if (notificationError) throw notificationError;
      const emailRes = await supabase.functions.invoke("bookteam-send-notification-email", { body: { participante_id: participanteId, assunto: "Você pode iniciar sua jornada — Book Team", mensagem: `Seu pagamento foi aprovado e sua inscrição em ${livro} está confirmada. Você já pode iniciar sua jornada. Acesse sua área do aluno para começar.` } });
      if (emailRes.error) console.warn("E-mail de liberação não enviado:", emailRes.error.message);
    },
    onSuccess: () => { toast.success("Aluno liberado para iniciar. A notificação foi registrada."); qc.invalidateQueries({ queryKey: ["admin-inscricoes"] }); qc.invalidateQueries({ queryKey: ["admin-alunos"] }); qc.invalidateQueries({ queryKey: ["meus-inscricoes"] }); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível liberar o aluno."),
  });
  return <div className="space-y-5"><div><h1 className="font-serif text-3xl font-bold">Aprovar inscrições</h1><p className="mt-1 text-sm text-muted-foreground">Só aparecem aqui inscrições cujo pagamento já foi aprovado. Ao liberar, o aluno fica como <strong>participando</strong> e recebe a orientação para iniciar.</p></div><Card className="border-gold/30 bg-gold/5"><CardContent className="flex gap-3 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold"/><div><p className="font-semibold">Fluxo correto</p><p className="text-sm text-muted-foreground">1. Aluno se inscreve → 2. paga → 3. ADM aprova o pagamento → 4. a inscrição é confirmada → 5. ADM libera o início → 6. aluno pode começar.</p></div></CardContent></Card>{query.isLoading&&<p className="text-sm text-muted-foreground">Carregando inscrições…</p>}{query.isError&&<p className="text-sm text-destructive">Não foi possível carregar as inscrições confirmadas.</p>}{!query.isLoading&&!query.isError&&(query.data??[]).length===0&&<Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma inscrição aguardando liberação. As inscrições só aparecem aqui após o pagamento ser aprovado.</CardContent></Card>}<div className="space-y-3">{(query.data??[]).map(i=>{const a=i.participante;return <Card key={i.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-serif text-lg font-semibold">{a?.nome??"Aluno"}</p><Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3"/> Pagamento aprovado</Badge></div><p className="text-sm">{i.livro?.titulo??"Livro não informado"}</p><p className="text-xs text-muted-foreground">{i.turma?.nome??"Turma não informada"} {i.turma?.data_inicio?`• ${dataBR(i.turma.data_inicio)}`:""}</p><p className="text-xs text-muted-foreground">{a?.email??""}</p></div><Button disabled={liberar.isPending} onClick={()=>liberar.mutate(i)} className="w-full sm:w-auto"><PlayCircle className="mr-2 h-4 w-4"/> Liberar início</Button></CardContent></Card>})}</div></div>;
}
