import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { resubmeterComprovante, notificarAdminResubmissao } from "@/lib/pagamento-recusa";

interface PagamentoRecusaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoId: string;
  aluno: {
    nome: string;
    email: string;
  };
  livroTitulo: string;
  valor: number;
  motivoRecusa: string;
  onSuccess: () => void;
}

export function PagamentoRecusaDialog({
  open,
  onOpenChange,
  pagamentoId,
  aluno,
  livroTitulo,
  valor,
  motivoRecusa,
  onSuccess,
}: PagamentoRecusaDialogProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resposta, setResposta] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  const resubmeter = useMutation({
    mutationFn: async () => {
      if (!arquivo) throw new Error("Selecione um arquivo");
      if (resposta.trim().length < 10)
        throw new Error("Deixe um comentário com pelo menos 10 caracteres");

      // Resubmeter comprovante
      await resubmeterComprovante(pagamentoId, arquivo, resposta);

      // Notificar admin
      await notificarAdminResubmissao(
        pagamentoId,
        aluno.nome,
        aluno.email,
        livroTitulo,
        valor
      );
    },
    onSuccess: () => {
      toast.success(
        "✅ Comprovante reenviado! O admin analisará em breve."
      );
      onOpenChange(false);
      onSuccess();
      setArquivo(null);
      setResposta("");
      setNomeArquivo(null);
    },
    onError: (erro) => {
      toast.error(
        erro instanceof Error ? erro.message : "Erro ao reenviar"
      );
    },
  });

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máximo 10MB)");
        return;
      }
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
        toast.error("Apenas PDF, JPG ou PNG");
        return;
      }
      setArquivo(file);
      setNomeArquivo(file.name);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Pagamento Recusado
          </DialogTitle>
          <DialogDescription>
            Envie um novo comprovante ou responda sobre a recusa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info do Pagamento */}
          <Card className="border-red-500/30 bg-red-500/5 p-4">
            <div className="space-y-2 text-sm">
              <p>
                <strong>Curso:</strong> {livroTitulo}
              </p>
              <p>
                <strong>Valor:</strong> R$ {valor.toFixed(2)}
              </p>
              <p>
                <strong>Motivo da recusa:</strong>
              </p>
              <div className="rounded border border-red-500/30 bg-white/50 p-2 text-red-700">
                {motivoRecusa || "Sem motivo especificado"}
              </div>
            </div>
          </Card>

          {/* Opção 1: Novo Comprovante */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              📄 Novo Comprovante de Pagamento
            </Label>
            <p className="text-xs text-muted-foreground">
              Envie a captura de tela ou comprovante do pagamento realizado
            </p>

            <div className="relative rounded-lg border-2 border-dashed border-gold/30 p-6 text-center">
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png"
                onChange={handleArquivoChange}
                disabled={resubmeter.isPending}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <div className="pointer-events-none space-y-2">
                <Upload className="mx-auto h-8 w-8 text-gold/60" />
                <div>
                  <p className="font-semibold text-gold">
                    {nomeArquivo || "Clique ou arraste aqui"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG ou PNG (máx 10MB)
                  </p>
                </div>
              </div>
            </div>

            {arquivo && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {nomeArquivo}
              </div>
            )}
          </div>

          {/* Opção 2: Resposta/Comentário */}
          <div className="space-y-3">
            <Label htmlFor="resposta" className="text-base font-semibold">
              💬 Seu Comentário
            </Label>
            <p className="text-xs text-muted-foreground">
              Explique sobre o comprovante ou responda sobre a recusa
            </p>

            <Textarea
              id="resposta"
              placeholder="Ex: Enviei o comprovante certo desta vez. Segue captura do extrato bancário mostrando a transferência realizada..."
              value={resposta}
              onChange={(e) => setResposta(e.target.value)}
              disabled={resubmeter.isPending}
              className="min-h-24 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {resposta.length}/500 caracteres
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={resubmeter.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => resubmeter.mutate()}
              disabled={!arquivo || resposta.length < 10 || resubmeter.isPending}
              className="flex-1 gap-2 bg-gold text-primary-foreground"
            >
              {resubmeter.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Enviar Comprovante
            </Button>
          </div>

          {/* Info de Suporte */}
          <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700">
            <p className="font-semibold">💡 Dica:</p>
            <p>O admin analisará seu novo comprovante e entrará em contato.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
