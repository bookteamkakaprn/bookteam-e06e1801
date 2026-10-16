import { supabase } from "@/integrations/supabase/client";

export interface PagamentoRejeitado {
  id: string;
  valor: number;
  status: "rejeitado";
  observacao: string | null;
  data_resubmissao?: string | null;
  resposta_aluno?: string | null;
}

export const TIPOS_COMPROVANTE = ["application/pdf", "image/jpeg", "image/png"];
export const TAMANHO_MAX_COMPROVANTE = 10 * 1024 * 1024;

const EXTENSAO_POR_TIPO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// A tipagem gerada não inclui a função RPC; o acesso fica isolado aqui.
type RpcResult = { data: unknown; error: { message: string } | null };
const db = supabase as unknown as {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

/** Valida tipo e tamanho antes de qualquer envio. Retorna a mensagem de erro ou null. */
export function validarComprovante(file: File): string | null {
  if (!TIPOS_COMPROVANTE.includes(file.type)) return "Apenas PDF, JPG ou PNG";
  if (file.size > TAMANHO_MAX_COMPROVANTE) return "Arquivo muito grande (máximo 10MB)";
  return null;
}

/**
 * Registra o caminho do comprovante no pagamento pela função aluno_enviar_comprovante.
 * Se o registro falhar, remove o arquivo recém-enviado para não deixar órfão no Storage.
 */
export async function registrarComprovante(params: {
  pagamentoId: string;
  caminho: string;
  resposta?: string | null;
}): Promise<void> {
  const { error } = await db.rpc("aluno_enviar_comprovante", {
    p_pagamento_id: params.pagamentoId,
    p_caminho: params.caminho,
    p_resposta: params.resposta ?? null,
  });

  if (error) {
    await supabase.storage.from("comprovantes").remove([params.caminho]);
    throw new Error(error.message);
  }
}

/**
 * Envia um novo comprovante após recusa: upload na pasta do usuário e registro via RPC.
 * O comentário do aluno é obrigatório e é gravado junto com o reenvio.
 */
export async function resubmeterComprovante(
  pagamentoId: string,
  novoComprovanteFile: File,
  respostaAluno: string
): Promise<void> {
  const erroValidacao = validarComprovante(novoComprovanteFile);
  if (erroValidacao) throw new Error(erroValidacao);

  if (respostaAluno.trim().length < 10) {
    throw new Error("Deixe um comentário com pelo menos 10 caracteres");
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente.");

  const extensao = EXTENSAO_POR_TIPO[novoComprovanteFile.type];
  const caminho = `${authData.user.id}/resubmissao/${pagamentoId}-${Date.now()}.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("comprovantes")
    .upload(caminho, novoComprovanteFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: novoComprovanteFile.type,
    });

  if (uploadError) throw new Error(`Erro ao enviar o arquivo: ${uploadError.message}`);

  await registrarComprovante({
    pagamentoId,
    caminho,
    resposta: respostaAluno.trim(),
  });
}

/**
 * Notificar admin que aluno resubmeteu comprovante.
 * Chamada depois do registro: falha aqui não desfaz o reenvio.
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
