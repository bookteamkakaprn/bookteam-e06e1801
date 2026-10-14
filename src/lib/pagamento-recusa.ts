import { supabase } from "@/integrations/supabase/client";

export interface PagamentoRejeitado {
  id: string;
  valor: number;
  status: "rejeitada";
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
    // Usa uma pasta associada ao usuário autenticado, compatível com políticas de Storage.
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

    // 2. Atualizar o registro com o caminho privado do Storage.
    // A tela administrativa usa o mesmo campo comprovante_url para abrir o arquivo.
    // 3. Atualizar pagamento no banco
    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        comprovante_resubmissao_url: uploadData.path,
        comprovante_url: uploadData.path,
        comprovante_enviado_em: new Date().toISOString(),
        resposta_aluno: respostaAluno,
        data_resubmissao: new Date().toISOString(),
        status_resubmissao: "aguardando",
        status: "aguardando",
      })
      .eq("id", pagamentoId);

    if (updateError) throw updateError;

    return { url: uploadData.path };
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro ?? "erro desconhecido");
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
        to: "admin@ministeriobookteam.com.br", // Email do admin
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
