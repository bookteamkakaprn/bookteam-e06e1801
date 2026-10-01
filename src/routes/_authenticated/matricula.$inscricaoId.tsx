import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emailComprovanteRecebido } from "@/lib/email-service";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, Loader2, Upload } from "lucide-react";

const pixField = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;
const crc16 = (value: string) => {
  let crc = 0xffff;
  for (let i = 0; i < value.length; i++) {
    crc ^= value.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};
const gerarPixPayload = (chave: string, beneficiario?: string | null) => {
  const nome = (beneficiario || "BOOK TEAM").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^A-Za-z0-9 ]/g, "").slice(0, 25) || "BOOK TEAM";
  const cidade = "CURITIBA";
  const merchantAccount = pixField("00", "BR.GOV.BCB.PIX") + pixField("01", chave.trim());
  const semCrc = pixField("00", "01") + pixField("26", merchantAccount) + pixField("52", "0000") + pixField("53", "986") + pixField("58", "BR") + pixField("59", nome) + pixField("60", cidade) + pixField("62", pixField("05", "***")) + "6304";
  return semCrc + crc16(semCrc);
};

export const Route = createFileRoute("/_authenticated/matricula/$inscricaoId")({
  head: () => ({
    meta: [
      { title: "Matrícula — Book Team" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatriculaPage,
});

const MAX_SIZE = 5 * 1024 * 1024;

const ALLOWED = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
];

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
        .select(
          "*, turmas(*, livros(titulo)), pagamentos(id, status, valor, created_at, comprovante_enviado_em)"
        )
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

  const desinscrever = useMutation({
    mutationFn: async () => {
      if (!user || !data) {
        throw new Error("Dados não encontrados");
      }

      if (
        !window.confirm(
          "Tem certeza que deseja se desinscrever deste curso? Esta ação não pode ser desfeita."
        )
      ) {
        return false;
      }

      const { error } = await supabase
        .from("inscricoes")
        .update({ status: "cancelada" })
        .eq("id", inscricaoId);

      if (error) throw error;
      return true;
    },

    onSuccess: (ok) => {
      if (!ok) return;

      toast.success("Você foi desinscrito do curso.");

      setTimeout(() => {
        window.location.href = "/inicio";
      }, 1000);
    },

    onError: (e: unknown) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao desinscrever"
      );
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      if (!user || !data) {
        throw new Error("Matrícula não encontrada");
      }

      if (!file) {
        throw new Error("Selecione o comprovante");
      }

      if (file.size > MAX_SIZE) {
        throw new Error("Arquivo maior que 5 MB");
      }

      if (!ALLOWED.includes(file.type)) {
        throw new Error(
          "Formato inválido — use PDF, JPG, JPEG ou PNG"
        );
      }

      const ext = (
        file.name.split(".").pop() ?? "bin"
      ).toLowerCase();

      const path = `${user.id}/${inscricaoId}/${Date.now()}.${ext}`;

      /*
       * 1. Envia o arquivo para o Storage privado
       */
      const up = await supabase.storage
        .from("comprovantes")
        .upload(path, file, {
          upsert: false,
          contentType: file.type,
        });

      if (up.error) {
        throw new Error(
          `Erro ao enviar arquivo: ${up.error.message}`
        );
      }

      /*
       * 2. Verifica se já existe um pagamento
       */
      const pagamentoAtual = data.pagamentos?.[0];

      /*
       * 3. Se já existe pagamento, atualiza.
       *    Isso evita criar vários pagamentos para a mesma matrícula.
       */
      if (pagamentoAtual) {
        const { error } = await supabase
          .from("pagamentos")
          .update({
            comprovante_url: path,
            comprovante_enviado_em: new Date().toISOString(),
            status: "aguardando",
          })
          .eq("id", pagamentoAtual.id);

        if (error) {
          throw new Error(
            `Erro ao salvar comprovante: ${error.message}`
          );
        }
      } else {
        /*
         * 4. Se ainda não existe pagamento, cria um novo.
         */
        const { error } = await supabase
          .from("pagamentos")
          .insert({
            inscricao_id: inscricaoId,
            participante_id: user.id,
            turma_id: data.turma_id ?? data.turmas?.id ?? null,
            valor: Number(data.turmas?.valor ?? 0),
            comprovante_url: path,
            comprovante_enviado_em: new Date().toISOString(),
            status: "aguardando",
          });

        if (error) {
          throw new Error(
            `Erro ao registrar pagamento: ${error.message}`
          );
        }
      }

      // O comprovante foi recebido, mas pagamento e vaga ainda estão em análise.
      if (user.email) {
        try {
          await emailComprovanteRecebido(
            user.email,
            data.participantes?.nome || user.user_metadata?.nome || "Aluno(a)",
            data.turmas?.livros?.titulo || "Curso",
            data.turmas?.nome || "Turma",
          );
        } catch (emailError) {
          console.error("Erro ao enviar email de recebimento do comprovante:", emailError);
        }
      }
    },

    onSuccess: () => {
      toast.success("Comprovante enviado com sucesso!");

      setFile(null);
      setObs("");

      qc.invalidateQueries({
        queryKey: ["matricula", inscricaoId],
      });
    },

    onError: (e: unknown) => {
      toast.error(
        e instanceof Error
          ? e.message
          : "Erro ao enviar comprovante"
      );
    },
  });

  if (isLoading) {
    return (
      <p className="text-muted-foreground">
        Carregando...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">
          Matrícula não encontrada.
        </p>

        <Button
          asChild
          variant="link"
          className="px-0"
        >
          <Link to="/inicio">
            Voltar ao painel
          </Link>
        </Button>
      </div>
    );
  }

  const turma = data.turmas;
  const pagamento = data.pagamentos?.[0];

  return (
    <div className="space-y-6">

      {/* Cabeçalho da matrícula */}
      <div>
        <h1 className="font-serif text-2xl font-semibold">
          {turma?.livros?.titulo ?? "Matrícula"}
        </h1>

        <p className="text-sm text-muted-foreground">
          {[
            turma?.nome,
            turma?.horario,
            turma?.sala,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {data.codigo && (
          <p className="mt-1 text-xs text-muted-foreground">
            Código: {data.codigo}
          </p>
        )}
      </div>

      {/* Status do pagamento */}
      {pagamento && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">

            <div>
              <p className="text-sm font-semibold">
                Status do pagamento
              </p>

              <p className="text-sm text-muted-foreground">
                {pagamento.status === "aprovado"
                  ? "Pagamento aprovado — inscrição confirmada."
                  : pagamento.status === "rejeitado"
                    ? "Comprovante recusado. Envie um novo comprovante."
                    : pagamento.comprovante_enviado_em
                      ? "Comprovante enviado — aguardando validação do administrador."
                      : "Pagamento pendente — envie o comprovante após realizar o PIX."}
              </p>
            </div>

            <Badge
              variant={
                pagamento.status === "aprovado"
                  ? "secondary"
                  : "outline"
              }
              className="gap-1"
            >
              <Clock className="h-3.5 w-3.5" />

              {pagamento.status === "aprovado"
                ? "Pago"
                : pagamento.status === "rejeitado"
                  ? "Recusado"
                  : pagamento.comprovante_enviado_em
                    ? "Aguardando validação"
                    : "Pendente"}
            </Badge>

          </CardContent>
        </Card>
      )}

      {/* QR Code PIX — sem valor fixado */}
      {pix?.pix_chave && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-5">
            <p className="text-center text-sm font-medium">Escaneie o QR Code para pagar via PIX</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(gerarPixPayload(pix.pix_chave, pix.beneficiario))}`}
              alt="QR Code PIX"
              loading="eager"
              className="h-64 w-64 rounded-xl border bg-white p-2 object-contain"
            />
            <p className="text-center text-xs text-muted-foreground">O valor não está definido no QR Code. Informe o valor no aplicativo do seu banco.</p>
          </CardContent>
        </Card>
      )}

      {/* Enviar comprovante */}
      <Card>

        <CardHeader>
          <CardTitle className="text-base">
            Enviar comprovante
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {turma?.valor != null && (
            <p className="text-sm text-muted-foreground">
              Valor:{" "}
              <span className="font-semibold text-foreground">
                {Number(turma.valor).toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL",
                  }
                )}
              </span>
            </p>
          )}

          <div className="space-y-1.5">

            <Label htmlFor="arquivo">
              Anexe seu comprovante (PDF, PNG, JPG ou JPEG — até 5 MB)
            </Label>

            <div className="rounded-lg border border-amber-300/40 bg-amber-50/5 p-3">
              <Input
                id="arquivo"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0] ?? null
                  )
                }
                className="h-12 cursor-pointer border-amber-300/50 bg-amber-100 text-sm text-black file:mr-3 file:rounded-md file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-amber-200"
              />
              <p className="mt-2 text-xs font-medium text-amber-200">
                👆 Toque em “Escolher arquivo” para anexar o comprovante
              </p>
            </div>

            {file && (
              <p className="text-xs text-muted-foreground">
                Arquivo selecionado:{" "}
                <span className="font-medium text-foreground">
                  {file.name}
                </span>
              </p>
            )}

          </div>

          <div className="space-y-1.5">

            <Label htmlFor="obs">
              Observação (opcional)
            </Label>

            <Textarea
              id="obs"
              value={obs}
              onChange={(e) =>
                setObs(e.target.value)
              }
              placeholder="Se necessário, escreva uma observação..."
            />

          </div>

          <Button
            className="h-12 gap-2 bg-amber-300 px-6 text-base font-semibold text-black shadow-md hover:bg-amber-200"
            disabled={enviar.isPending}
            onClick={() => enviar.mutate()}
          >
            {enviar.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}

            {enviar.isPending
              ? "Enviando..."
              : "Enviar comprovante"}
          </Button>

        </CardContent>
      </Card>

      {/* Botão de desinscrição */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={desinscrever.isPending}
          onClick={() => desinscrever.mutate()}
        >
          {desinscrever.isPending
            ? "Desinscrever..."
            : "Desinscrever do curso"}
        </Button>
      </div>

    </div>
  );
}
