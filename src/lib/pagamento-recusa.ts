import { supabase } from "@/integrations/supabase/client";

export interface PagamentoRejeitado {
  id: string;
  valor: number;
  status: "rejeitado";
  observacao: string;
  data_resubmissao?: string | null;
  resposta_aluno?: string | null;
  status_resubmissao?: string | null;
}

/**
 * Fazer upload de novo comprovante após rejeição
 */
export async function resubmeterComprovante(
  pagamentoId: string,
  novoComprovanteFile: File,
  respostaAluno: string
): Promise<{ url: string }> {
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente.");

    const extensao = novoComprovanteFile.name.split(".").pop()?.toLowerCase() || "bin";
    const nomeArquivo = `${authData.user.id}/resubmissao/${pagamentoId}-${Date.now()}.${extensao}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(nomeArquivo, novoComprovanteFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: novoComprovanteFile.type || "application/octet-stream",
      });

    if (uploadError) throw uploadError;

    const agora = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        comprovante_resubmissao_url: uploadData.path,
        comprovante_url: uploadData.path,
        comprovante_enviado_em: agora,
        resposta_aluno: respostaAluno,
        data_resubmissao: agora,
        status_resubmissao: "aguardando",
        status: "aguardando",
      })
      .eq("id", pagamentoId);

    if (updateError) throw updateError;

    return { url: uploadData.path };
  } catch (erro) {
    const objeto = erro && typeof erro === "object"
      ? erro as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
      : null;
    const detalhe = [
      objeto?.message,
      objeto?.details,
      objeto?.hint,
      objeto?.code,
      erro instanceof Error ? erro.message : typeof erro === "string" ? erro : null,
    ].filter(Boolean).map(String).join(" | ") || "Falha sem detalhes retornados pelo servidor";
    throw new Error(`Erro ao resubmeter comprovante: ${detalhe}`);
  }
}

/**
 * Buscar pagamento rejeitado para aluno rever
 */
export async function buscarPagamentoRejeitado(
  pagamentoId: string
): Promise<PagamentoRejeitado | null> {
  const { data, error } = await supabase
    .from("pagamentos")
    .select("id, valor, status, observacao, data_resubmissao, resposta_aluno, status_resubmissao")
    .eq("id", pagamentoId)
    .eq("status", "rejeitado")
    .maybeSingle();

  if (error) throw error;
  return data as PagamentoRejeitado | null;
}

/**
 * Notificar admin que aluno resubmeteu comprovante
 */
export async function notificarAdminResubmissao(
  pagamentoId: string,
  nomeAluno: string,
  emailAluno: string,
  livroTitulo: string,
  valor: number
): Promise<void> {
  const response = await fetch(
    "https://vvkadbiytmgholjduyqi.supabase.co/functions/v1/bookteam-send-notification-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "admin@ministeriobookteam.com.br",
        tipo: "comprovante_resubmetido",
        nome: nomeAluno,
        aluno_email: emailAluno,
        livro: livroTitulo,
        valor: valor,
        pagamento_id: pagamentoId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao notificar admin: ${error}`);
  }
}
