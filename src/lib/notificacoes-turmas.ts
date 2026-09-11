import { supabase } from "@/integrations/supabase/client";

export interface NotificacaoTurma {
  id: string;
  participante_id: string;
  livro_id: string;
  notificado: boolean;
  created_at: string;
}

/**
 * Inscrever aluno para notificação quando turma abrir
 */
export async function inscreverNotificacao(
  participanteId: string,
  livroId: string
): Promise<void> {
  // Verificar se já existe notificação para este aluno e livro
  const { data: existente } = await supabase
    .from("notificacoes_turmas")
    .select("id")
    .eq("participante_id", participanteId)
    .eq("livro_id", livroId)
    .eq("notificado", false)
    .maybeSingle();

  if (existente) {
    throw new Error("Você já se inscreveu para ser notificado neste curso.");
  }

  // Criar nova notificação
  const { error } = await supabase.from("notificacoes_turmas").insert({
    participante_id: participanteId,
    livro_id: livroId,
    notificado: false,
  });

  if (error) throw error;
}

/**
 * Buscar todas as notificações pendentes para um livro
 */
export async function buscarNotificacoesPendentes(
  livroId: string
): Promise<NotificacaoTurma[]> {
  const { data, error } = await supabase
    .from("notificacoes_turmas")
    .select("id, participante_id, livro_id, notificado, created_at")
    .eq("livro_id", livroId)
    .eq("notificado", false);

  if (error) throw error;
  return (data ?? []) as NotificacaoTurma[];
}

/**
 * Marcar notificação como enviada
 */
export async function marcarNotificacaoEnviada(
  notificacaoId: string
): Promise<void> {
  const { error } = await supabase
    .from("notificacoes_turmas")
    .update({ notificado: true })
    .eq("id", notificacaoId);

  if (error) throw error;
}

/**
 * Enviar email de notificação de turma aberta
 */
export async function enviarNotificacaoTurmaAberta(
  email: string,
  nome: string,
  livroTitulo: string,
  turmaNome: string,
  dataInicio: string
): Promise<void> {
  const response = await fetch(
    "https://vvkadbiytmgholj.supabase.co/functions/v1/bookteam-send-notification-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        tipo: "turma_aberta",
        nome,
        livro: livroTitulo,
        turma: turmaNome,
        data_inicio: dataInicio,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao enviar email: ${error}`);
  }
}
