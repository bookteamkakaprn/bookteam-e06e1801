import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar, MapPin, Users, Copy, Upload, CheckCircle2, Clock, AlertCircle, FileText,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/inscricao/$eventoId")({
  head: () => ({ meta: [{ title: "Inscrição — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InscricaoPage,
});

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

type PagRow = {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
};

function InscricaoPage() {
  const { eventoId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [obs, setObs] = useState("");

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["inscricao", eventoId, user?.id],
    queryFn: async () => {
      const eventoRes = await supabase
        .from("eventos")
        .select("*, livros(titulo, trilha_id)")
        .eq("id", eventoId)
        .maybeSingle();
      const inscRes = await supabase
        .from("inscricoes")
        .select("*, pagamentos(id, status, valor, comprovante_url, observacao, created_at)")
        .eq("evento_id", eventoId)
        .eq("participante_id", user!.id)
        .maybeSingle();
      if (eventoRes.error) throw eventoRes.error;
      return { evento: eventoRes.data, inscricao: inscRes.data };
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado");
      if (!data?.evento) throw new Error("Encontro não encontrado");
      if (!file) throw new Error("Selecione o comprovante do PIX");
      if (file.size > MAX_SIZE) throw new Error("Arquivo maior que 10 MB");
      if (!ALLOWED.includes(file.type)) throw new Error("Formato inválido — use PDF, JPG, PNG ou WEBP");

      let inscricaoId = data.inscricao?.id as string | undefined;
      if (!inscricaoId) {
        const ins = await supabase
          .from("inscricoes")
          .insert({
            evento_id: eventoId,
            participante_id: user.id,
            status: "aguardando_pagamento",
          })
          .select("id")
          .single();
        if (ins.error) throw ins.error;
        inscricaoId = ins.data.id;
      }

      const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
      const path = `${user.id}/${eventoId}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("comprovantes")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (up.error) throw up.error;

      const pag = await supabase.from("pagamentos").insert({
        inscricao_id: inscricaoId,
        participante_id: user.id,
        evento_id: eventoId,
        valor: data.evento.valor,
        comprovante_url: path,
        status: "aguardando",
        observacao: obs || null,
      });
      if (pag.error) throw pag.error;
    },
    onSuccess: () => {
      toast.success("Comprovante enviado! Aguarde a validação.");
      setFile(null);
      setObs("");
      qc.invalidateQueries({ queryKey: ["inscricao", eventoId] });
      qc.invalidateQueries({ queryKey: ["minhas-inscricoes"] });
      qc.invalidateQueries({ queryKey: ["meus-pagamentos"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (!data?.evento) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">Encontro não encontrado.</p>
        <Button asChild variant="link" className="px-0">
          <Link to="/eventos">Ver encontros</Link>
        </Button>
      </div>
    );
  }

  const { evento, inscricao } = data;
  const pagamentos = (inscricao?.pagamentos ?? []) as PagRow[];
  const ultimoPag = [...pagamentos].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  let statusLabel = "Sem inscrição";
  let statusVariant: "secondary" | "default" | "destructive" | "outline" = "outline";
  let StatusIcon = AlertCircle;
  if (inscricao) {
    if (inscricao.status === "confirmada") {
      statusLabel = "Inscrição confirmada";
      statusVariant = "default";
      StatusIcon = CheckCircle2;
    } else if (ultimoPag?.status === "aguardando") {
      statusLabel = "Pagamento em validação";
      statusVariant = "secondary";
      StatusIcon = Clock;
    } else if (ultimoPag?.status === "rejeitado") {
      statusLabel = "Comprovante não validado — reenvie";
      statusVariant = "destructive";
      StatusIcon = AlertCircle;
    } else {
      statusLabel = "Pendente de pagamento";
      statusVariant = "outline";
      StatusIcon = AlertCircle;
    }
  }

  const podeEnviar = !inscricao || inscricao.status !== "confirmada";

  async function copyPix() {
    if (!evento?.pix_copia_cola) return;
    await navigator.clipboard.writeText(evento.pix_copia_cola);
    toast.success("PIX copiado!");
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
          <Link to="/eventos">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar aos encontros
          </Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold">{evento.titulo}</h1>
        {evento.descricao && <p className="mt-1 text-muted-foreground">{evento.descricao}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date(evento.data + "T00:00:00").toLocaleDateString("pt-BR")} {evento.hora?.slice(0, 5)}
          </span>
          {(evento.cidade || evento.local) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {[evento.local, evento.cidade].filter(Boolean).join(" — ")}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4" /> {evento.vagas} vagas
          </span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Status da inscrição</CardTitle>
          <Badge variant={statusVariant} className="inline-flex items-center gap-1">
            <StatusIcon className="h-3 w-3" /> {statusLabel}
          </Badge>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {inscricao ? (
            <ul className="space-y-1">
              <li>• Inscrição criada em {new Date(inscricao.created_at).toLocaleString("pt-BR")}</li>
              {ultimoPag && (
                <li>
                  • Último comprovante enviado em {new Date(ultimoPag.created_at).toLocaleString("pt-BR")} —{" "}
                  <span className="capitalize">{ultimoPag.status}</span>
                </li>
              )}
              {ultimoPag?.observacao && <li>• Observação: {ultimoPag.observacao}</li>}
            </ul>
          ) : (
            <p>Envie seu comprovante para reservar a vaga.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados para PIX</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor</p>
              <p className="font-serif text-2xl font-semibold text-gold">
                {Number(evento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
            {evento.pix_chave && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Chave PIX</p>
                <p className="break-all font-mono text-sm">{evento.pix_chave}</p>
              </div>
            )}
            {evento.pix_copia_cola && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">PIX copia-e-cola</p>
                <div className="mt-1 flex gap-2">
                  <code className="line-clamp-3 flex-1 break-all rounded bg-muted p-2 text-xs">
                    {evento.pix_copia_cola}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyPix}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            {evento.pix_qrcode_url && (
              <img
                src={evento.pix_qrcode_url}
                alt="QR Code PIX"
                className="mx-auto h-40 w-40 rounded border border-border"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{podeEnviar ? "Enviar comprovante" : "Comprovante"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {podeEnviar ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="file">Arquivo (PDF, JPG, PNG ou WEBP — até 10 MB)</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FileText className="h-3 w-3" /> {file.name} ({Math.round(file.size / 1024)} KB)
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obs">Observação (opcional)</Label>
                  <Textarea
                    id="obs"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    rows={2}
                    placeholder="Ex.: paguei em 12/10 pela minha esposa"
                  />
                </div>
                <Button
                  className="w-full bg-gold text-primary-foreground hover:bg-gold/90"
                  disabled={!file || submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {submit.isPending ? "Enviando…" : ultimoPag ? "Reenviar comprovante" : "Confirmar inscrição"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sua inscrição já está confirmada. Nos vemos no encontro!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}