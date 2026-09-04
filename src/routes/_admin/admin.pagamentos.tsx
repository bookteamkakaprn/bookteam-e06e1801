import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos — Admin — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: AdminPag,
});

type Pagamento = {
  id: string;
  status: "aguardando" | "aprovado" | "rejeitado";
  valor: number;
  comprovante_url: string | null;
  created_at: string;
  inscricao: {
    id: string;
    status: string;
    participante: { nome: string | null; email: string | null; telefone: string | null } | null;
    livro: { titulo: string; autor: string | null } | null;
    turma: { nome: string | null; data_inicio: string | null; data_fim: string | null } | null;
    evento: { nome: string | null; data_evento: string | null; local: string | null } | null;
  } | null;
};

const FILTROS = [
  { value: "aguardando", label: "Pendentes" },
  { value: "aprovado", label: "Aprovados" },
  { value: "rejeitado", label: "Recusados" },
  { value: "todos", label: "Todos" },
] as const;
type Filtro = (typeof FILTROS)[number]["value"];

function moeda(v: number) { return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function dataBR(v: string | null) { return v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—"; }

function AdminPag() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filtro>("aguardando");

  const query = useQuery({
    queryKey: ["admin-pagamentos", filter],
    queryFn: async () => {
      let q = supabase.from("pagamentos").select(`id,status,valor,comprovante_url,created_at,inscricao:inscricoes(id,status,participante:participantes(nome,email,telefone),livro:livros(titulo,autor),turma:turmas(nome,data_inicio,data_fim),evento:eventos(nome,data_evento,local))`).order("created_at", { ascending: false });
      if (filter !== "todos") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Pagamento[];
    },
  });

  const decidir = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprovado" | "rejeitado" }) => {
      const { error } = await supabase.from("pagamentos").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "aprovado" ? "Pagamento aprovado. A inscrição foi confirmada automaticamente." : "Pagamento recusado. O aluno deverá regularizar o pagamento.");
      qc.invalidateQueries({ queryKey: ["admin-pagamentos"] });
      qc.invalidateQueries({ queryKey: ["admin-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o pagamento."),
  });

  async function abrirComprovante(url: string) {
    const { data, error } = await supabase.storage.from("comprovantes").createSignedUrl(url, 300);
    if (error || !data?.signedUrl) { toast.error("Não foi possível abrir o comprovante."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-serif text-3xl font-bold">Aprovar pagamentos</h1><p className="text-sm text-muted-foreground">O pagamento é a primeira aprovação. Ao aprovar, a inscrição passa automaticamente para confirmada.</p></div>
        <div className="flex flex-wrap gap-1">{FILTROS.map(f => <Button key={f.value} size="sm" variant={filter === f.value ? "default" : "outline"} onClick={() => setFilter(f.value)}>{f.label}</Button>)}</div>
      </div>
      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando pagamentos…</p>}
      {query.isError && <p className="text-sm text-destructive">Não foi possível carregar os pagamentos. Verifique as permissões do banco.</p>}
      {!query.isLoading && !query.isError && (query.data ?? []).length === 0 && <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhum pagamento neste filtro.</CardContent></Card>}
      <div className="space-y-3">
        {(query.data ?? []).map(p => {
          const aluno = p.inscricao?.participante;
          const turma = p.inscricao?.turma;
          return <Card key={p.id}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><p className="font-serif text-lg font-semibold">{aluno?.nome ?? "Aluno"}</p><p className="text-sm text-foreground/80">{p.inscricao?.livro?.titulo ?? "Livro não informado"}</p><p className="text-xs text-muted-foreground">{turma?.nome ?? p.inscricao?.evento?.nome ?? "Turma não informada"} {turma?.data_inicio ? `• ${dataBR(turma.data_inicio)}` : ""}</p><p className="text-xs text-muted-foreground">{aluno?.email ?? ""}</p></div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end"><span className="font-serif text-lg">{moeda(p.valor)}</span><Badge variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"} className="inline-flex items-center gap-1">{p.status === "aprovado" ? <CheckCircle2 className="h-3 w-3" /> : p.status === "rejeitado" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{p.status === "aprovado" ? "Aprovado" : p.status === "rejeitado" ? "Recusado" : "Pendente"}</Badge>{p.comprovante_url && <Button size="sm" variant="outline" onClick={() => abrirComprovante(p.comprovante_url!)}><ExternalLink className="mr-1 h-4 w-4" /> Comprovante</Button>}{p.status === "aguardando" && <><Button size="sm" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: p.id, status: "aprovado" })}>Aprovar pagamento</Button><Button size="sm" variant="destructive" disabled={decidir.isPending} onClick={() => decidir.mutate({ id: p.id, status: "rejeitado" })}>Recusar</Button></>}</div>
          </CardContent></Card>;
        })}
      </div>
    </div>
  );
}
