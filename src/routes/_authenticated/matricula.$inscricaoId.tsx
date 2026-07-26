import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Loader2, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/matricula/$inscricaoId")({
  head: () => ({ meta: [{ title: "Matrícula — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: MatriculaPage,
});

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

function MatriculaPage() {
  const { inscricaoId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [obs, setObs] = useState("");

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["matricula", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes")
        .select("*, turmas(*, livros(titulo)), pagamentos(id, status, valor, created_at)")
        .eq("id", inscricaoId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: pix } = useQuery({
    queryKey: ["config-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_pagamento")
        .select("*")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!user || !data) throw new Error("Matrícula não encontrada");
      if (!file) throw new Error("Selecione o comprovante");
      if (file.size > MAX_SIZE) throw new Error("Arquivo maior que 10 MB");
      if (!ALLOWED.includes(file.type)) throw new Error("Formato inválido — use PDF, JPG, JPEG ou PNG");

      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const path = `${user.id}/${inscricaoId}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("comprovantes")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;

      const { error } = await supabase.from("pagamentos").insert({
        inscricao_id: inscricaoId,
        participante_id: user.id,
        turma_id: data.turma_id,
        valor: Number(data.turmas?.valor ?? 0),
        comprovante_url: path,
        status: "aguardando",
        observacao: obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comprovante enviado!");
      setFile(null);
      setObs("");
      qc.invalidateQueries({ queryKey: ["matricula", inscricaoId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Matrícula não encontrada.</p>
        <Button asChild variant="link" className="px-0"><Link to="/inicio">Voltar ao painel</Link></Button>
      </div>
    );
  }

  const turma = data.turmas;
  const pagamento = data.pagamentos?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold">{turma?.livros?.titulo ?? "Matrícula"}</h1>
        <p className="text-sm text-muted-foreground">
          {[turma?.nome, turma?.horario, turma?.sala].filter(Boolean).join(" · ")}
        </p>
        {data.codigo && <p className="mt-1 text-xs text-muted-foreground">Código: {data.codigo}</p>}
      </div>

      {pagamento && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold">Status do pagamento</p>
              <p className="text-sm text-muted-foreground">
                {pagamento.status === "aprovado"
                  ? "Pagamento aprovado — inscrição confirmada."
                  : pagamento.status === "rejeitado"
                    ? "Comprovante recusado. Envie um novo comprovante."
                    : "Aguardando validação financeira."}
              </p>
            </div>
            <Badge variant={pagamento.status === "aprovado" ? "secondary" : "outline"} className="gap-1">
              <Clock className="h-3.5 w-3.5" />
              {pagamento.status === "aprovado" ? "Pago" : pagamento.status === "rejeitado" ? "Recusado" : "Pendente"}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Enviar comprovante</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div />
        </CardContent>
        <CardContent className="space-y-4">
          {turma?.valor != null && (
            <p className="text-sm text-muted-foreground">
              Valor:{" "}
              <span className="font-semibold text-foreground">
                {Number(turma.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="arquivo">Arquivo (PDF, PNG, JPG ou JPEG — até 10 MB)</Label>
            <Input
              id="arquivo"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observação (opcional)</Label>
            <Textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
          <Button
            className="gap-2 bg-gold text-primary-foreground hover:bg-gold/90"
            disabled={enviar.isPending}
            onClick={() => enviar.mutate()}
          >
            {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Enviar comprovante
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}