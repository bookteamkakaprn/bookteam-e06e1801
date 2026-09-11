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
    // 1. Upload do arquivo para o Supabase Storage
    const nomeArquivo = `comprovante-resubmissao-${pagamentoId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("comprovantes")
      .upload(nomeArquivo, novoComprovanteFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 2. Obter URL pública
    const { data: publicUrl } = supabase.storage
      .from("comprovantes")
      .getPublicUrl(uploadData.path);

    // 3. Atualizar pagamento no banco
    const { error: updateError } = await supabase
      .from("pagamentos")
      .update({
        comprovante_resubmissao_url: publicUrl.publicUrl,
        resposta_aluno: respostaAluno,
        data_resubmissao: new Date().toISOString(),
        status_resubmissao: "aguardando", // Admin precisa revisar de novo
      })
      .eq("id", pagamentoId);

    if (updateError) throw updateError;

    return { url: publicUrl.publicUrl };
  } catch (erro) {
    throw new Error(
      `Erro ao resubmeter comprovante: ${erro instanceof Error ? erro.message : "erro desconhecido"}`
    );
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
    .eq("status", "rejeitada")
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
