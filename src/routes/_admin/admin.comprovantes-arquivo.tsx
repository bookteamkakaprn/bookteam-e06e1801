import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive, Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/comprovantes-arquivo")({
  component: AdminComprovantesArquivoPage,
});

const DIAS_RETENCAO = 30;
const BUCKET = "comprovantes";

type Item = {
  id: string;
  comprovante_url: string;
  comprovante_enviado_em: string | null;
  valor: number;
  status: string;
  inscricao: {
    participante: { nome: string | null; email: string | null } | null;
    livro: { titulo: string | null } | null;
    turma: { nome: string | null } | null;
  } | null;
};

const nomeSeguro = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60);

const extensaoDe = (path: string) => {
  const partes = path.split(".");
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : "bin";
};

const escapeCsv = (valor: unknown) => `"${String(valor ?? "").replace(/"/g, '""')}"`;

function AdminComprovantesArquivoPage() {
  const qc = useQueryClient();
  const [exportados, setExportados] = useState<Set<string>>(new Set());
  const [exportando, setExportando] = useState(false);

  const corte = useMemo(
    () => new Date(Date.now() - DIAS_RETENCAO * 24 * 60 * 60 * 1000).toISOString(),
    [],
  );

  const itensQ = useQuery({
    queryKey: ["admin-comprovantes-arquivo", corte],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pagamentos")
        .select(
          `id, comprovante_url, comprovante_enviado_em, valor, status,
           inscricao:inscricoes(participante:participantes(nome,email), livro:livros(titulo), turma:turmas(nome))`,
        )
        .not("comprovante_url", "is", null)
        .is("comprovante_removido_em", null)
        .lt("comprovante_enviado_em", corte)
        .order("comprovante_enviado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const itens = itensQ.data ?? [];
  const itensExportados = itens.filter((i) => exportados.has(i.id));

  const descrever = (item: Item) => {
    const aluno = item.inscricao?.participante?.nome || item.inscricao?.participante?.email || "aluno";
    return { aluno, curso: item.inscricao?.livro?.titulo ?? "", turma: item.inscricao?.turma?.nome ?? "" };
  };

  const gerarBackup = async () => {
    if (itens.length === 0) return;
    setExportando(true);
    try {
      const zip = new JSZip();
      const pasta = zip.folder("comprovantes")!;
      const linhas = ["pagamento_id;aluno;curso;turma;valor;status;enviado_em;arquivo"];
      const novos = new Set<string>();
      const falhas: string[] = [];

      for (const item of itens) {
        const { aluno, curso, turma } = descrever(item);
        const nomeArquivo = `${nomeSeguro(aluno)}_${item.id}.${extensaoDe(item.comprovante_url)}`;
        const { data, error } = await supabase.storage.from(BUCKET).download(item.comprovante_url);
        if (error || !data) {
          falhas.push(`${aluno} (${error?.message ?? "arquivo não encontrado"})`);
          continue;
        }
        pasta.file(nomeArquivo, data);
        linhas.push(
          [item.id, aluno, curso, turma, Number(item.valor).toFixed(2), item.status, item.comprovante_enviado_em ?? "", nomeArquivo]
            .map(escapeCsv)
            .join(";"),
        );
        novos.add(item.id);
      }

      if (novos.size === 0) {
        throw new Error("Nenhum comprovante pôde ser baixado. Nada foi marcado para remoção.");
      }

      zip.file("indice.csv", "﻿" + linhas.join("\n"));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprovantes-arquivo-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setExportados((atual) => new Set([...atual, ...novos]));
      if (falhas.length > 0) {
        toast.error(`Alguns comprovantes não foram baixados e não serão removidos: ${falhas.join(", ")}`);
      } else {
        toast.success(`Backup gerado com ${novos.size} comprovante(s). Confira o ZIP antes de apagar.`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o backup.");
    } finally {
      setExportando(false);
    }
  };

  const apagarExportados = useMutation({
    mutationFn: async () => {
      const lista = itensExportados;
      if (lista.length === 0) throw new Error("Gere o backup antes de apagar.");

      const caminhos = lista.map((i) => i.comprovante_url);
      const { error: erroStorage } = await supabase.storage.from(BUCKET).remove(caminhos);
      if (erroStorage) throw erroStorage;

      const agora = new Date().toISOString();
      const resultados = await Promise.all(
        lista.map((i) =>
          (supabase as any)
            .from("pagamentos")
            .update({ comprovante_url: null, comprovante_removido_em: agora })
            .eq("id", i.id),
        ),
      );
      const falha = resultados.find((r: any) => r.error);
      if (falha) throw falha.error;

      return lista.length;
    },
    onSuccess: (total) => {
      toast.success(`${total} comprovante(s) removido(s). Os dados dos pagamentos foram mantidos.`);
      setExportados(new Set());
      qc.invalidateQueries({ queryKey: ["admin-comprovantes-arquivo"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível remover os comprovantes."),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Arquivo de comprovantes</h1>
        <p className="text-sm text-muted-foreground">
          Comprovantes enviados há mais de {DIAS_RETENCAO} dias. Faça o backup no seu computador antes de apagar.
          Os dados do pagamento (aluno, valor, status e datas) são mantidos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Para arquivar</p>
              <p className="mt-1 text-2xl font-bold">{itensQ.isLoading ? "..." : itens.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Backup gerado nesta sessão</p>
              <p className="mt-1 text-2xl font-bold">{exportados.size}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">Prazo</p>
              <p className="mt-1 text-sm font-medium">Mais de {DIAS_RETENCAO} dias</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              className="gap-2"
              onClick={gerarBackup}
              disabled={exportando || itens.length === 0 || itensQ.isLoading}
            >
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportando ? "Gerando backup..." : "1. Gerar backup (ZIP)"}
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => {
                if (
                  window.confirm(
                    `Apagar ${itensExportados.length} comprovante(s) do sistema? Confirme que o ZIP foi salvo no seu computador. Esta ação não pode ser desfeita.`,
                  )
                ) {
                  apagarExportados.mutate();
                }
              }}
              disabled={apagarExportados.isPending || itensExportados.length === 0}
            >
              {apagarExportados.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              2. Apagar comprovantes exportados ({itensExportados.length})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            O botão de apagar só libera depois que o backup foi gerado nesta tela.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comprovantes a arquivar</CardTitle>
        </CardHeader>
        <CardContent>
          {itensQ.isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Carregando...</div>
          ) : itens.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum comprovante com mais de {DIAS_RETENCAO} dias.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Aluno</th>
                    <th className="px-4 py-3 text-left">Curso / turma</th>
                    <th className="px-4 py-3 text-left">Enviado em</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-center">Backup</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const { aluno, curso, turma } = descrever(item);
                    return (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-3">{aluno}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {curso}
                          {turma ? ` · ${turma}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          {item.comprovante_enviado_em
                            ? new Date(item.comprovante_enviado_em).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">{item.status}</td>
                        <td className="px-4 py-3 text-center">
                          {exportados.has(item.id) ? (
                            <Badge>Pronto para apagar</Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Archive className="h-3.5 w-3.5" />
        Após a remoção, o aluno deixa de ver o botão de comprovante desse pagamento.
      </p>
    </div>
  );
}
