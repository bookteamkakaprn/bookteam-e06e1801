import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { useState } from "react";

export type PagamentoAdmin = {
  id: string;
  status: string;
  valor: number;
  comprovante_url: string | null;
  observacao: string | null;
  created_at: string;
  participante: {
    nome: string | null;
    email: string | null;
    telefone: string | null;
    cpf: string | null;
    cidade: string | null;
    estado: string | null;
  } | null;
  evento: {
    id: string;
    titulo: string;
    data: string | null;
    hora: string | null;
    local: string | null;
    cidade: string | null;
    livro: {
      titulo: string;
      autor: string | null;
      trilha: { nome: string } | null;
    } | null;
  } | null;
};

export const STATUS_LABEL: Record<string, string> = {
  aguardando: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Recusado",
};

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-2 text-sm">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right font-medium text-foreground">{valor || "—"}</span>
    </div>
  );
}

export interface PagamentoDetalheProps {
  pagamento: PagamentoAdmin | null;
  onOpenChange: (open: boolean) => void;
  onDecidir: (args: { id: string; status: "aprovado" | "rejeitado"; observacao?: string }) => void;
  onSolicitarComprovante: (args: { id: string; observacao?: string }) => void;
  onVerComprovante: (path: string) => void;
  pendente?: boolean;
}

export function PagamentoDetalhe({
  pagamento,
  onOpenChange,
  onDecidir,
  onSolicitarComprovante,
  onVerComprovante,
  pendente,
}: PagamentoDetalheProps) {
  const [obs, setObs] = useState("");
  const p = pagamento;

  return (
    <Dialog
      open={!!p}
      onOpenChange={(o) => {
        if (!o) setObs("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        {p && (
          <>
            <DialogHeader>
              <DialogTitle className="font-serif">Pagamento — {p.participante?.nome ?? "Aluno"}</DialogTitle>
            </DialogHeader>

            <Badge
              variant={p.status === "aprovado" ? "default" : p.status === "rejeitado" ? "destructive" : "secondary"}
              className="w-fit"
            >
              {STATUS_LABEL[p.status] ?? p.status}
            </Badge>

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados do aluno</h3>
              <Linha rotulo="Nome" valor={p.participante?.nome ?? ""} />
              <Linha rotulo="E-mail" valor={p.participante?.email ?? ""} />
              <Linha rotulo="Telefone" valor={p.participante?.telefone ?? ""} />
              <Linha rotulo="CPF" valor={p.participante?.cpf ?? ""} />
              <Linha
                rotulo="Cidade / UF"
                valor={[p.participante?.cidade, p.participante?.estado].filter(Boolean).join(" / ")}
              />
            </section>

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inscrição</h3>
              <Linha rotulo="Curso" valor={p.evento?.livro?.trilha?.nome ?? ""} />
              <Linha
                rotulo="Livro"
                valor={
                  p.evento?.livro
                    ? `${p.evento.livro.titulo}${p.evento.livro.autor ? ` — ${p.evento.livro.autor}` : ""}`
                    : ""
                }
              />
              <Linha
                rotulo="Turma"
                valor={[
                  p.evento?.titulo,
                  p.evento?.data ? new Date(`${p.evento.data}T00:00:00`).toLocaleDateString("pt-BR") : null,
                  p.evento?.hora?.slice(0, 5),
                  p.evento?.local,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              />
              <Linha rotulo="Valor" valor={brl(p.valor)} />
              <Linha rotulo="Enviado em" valor={new Date(p.created_at).toLocaleString("pt-BR")} />
              {p.observacao && <Linha rotulo="Observação atual" valor={p.observacao} />}
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comprovante</h3>
              {p.comprovante_url ? (
                <Button variant="outline" size="sm" onClick={() => onVerComprovante(p.comprovante_url!)}>
                  <ExternalLink className="mr-1 h-4 w-4" /> Ver comprovante
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum comprovante enviado.</p>
              )}
            </section>

            <div className="space-y-1.5">
              <Label htmlFor="pag-obs">Observação (enviada ao aluno)</Label>
              <Textarea id="pag-obs" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={pendente} onClick={() => onDecidir({ id: p.id, status: "aprovado", observacao: obs })}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Aprovar
              </Button>
              <Button
                variant="destructive"
                disabled={pendente}
                onClick={() => onDecidir({ id: p.id, status: "rejeitado", observacao: obs })}
              >
                <XCircle className="mr-1 h-4 w-4" /> Recusar
              </Button>
              <Button
                variant="outline"
                disabled={pendente}
                onClick={() => onSolicitarComprovante({ id: p.id, observacao: obs })}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Solicitar novo comprovante
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
