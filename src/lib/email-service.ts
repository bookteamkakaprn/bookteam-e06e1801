import { supabase } from "@/integrations/supabase/client";

export type EmailTipo =
  | "pagamento_aprovado"
  | "pagamento_recusado"
  | "inscricao_aprovada"
  | "inscricao_recusada"
  | "curso_iniciado"
  | "customizado";

interface EmailPayload {
  to: string;
  tipo: EmailTipo;
  nome: string;
  livro?: string;
  turma?: string;
  motivo?: string;
  valor?: number;
  data_inicio?: string;
  assunto?: string;
  mensagem?: string;
}

/**
 * Enviar notificação por email via Edge Function (bookteam-send-notification-email)
 * Reutiliza RESEND_API_KEY já configurado
 * @param payload Dados do email a enviar
 */
export async function enviarEmail(payload: EmailPayload) {
  try {
    const { data, error } = await supabase.functions.invoke(
      "bookteam-send-notification-email",
      {
        body: payload,
      }
    );

    if (error) {
      console.error("Erro ao enviar email:", error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email service error:", error);
    throw error;
  }
}

/**
 * Enviar email de pagamento aprovado
 * @example
 * await emailPagamentoAprovado(
 *   "kelly@email.com",
 *   "Kelly",
 *   "Mantenha seu Amor Aceso",
 *   "Turma 2 — Terças",
 *   150.00
 * );
 */
export async function emailPagamentoAprovado(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  valor: number
) {
  return enviarEmail({
    to: email,
    tipo: "pagamento_aprovado",
    nome,
    livro,
    turma,
    valor,
  });
}

/**
 * Enviar email de pagamento recusado
 * @example
 * await emailPagamentoRecusado(
 *   "kelly@email.com",
 *   "Kelly",
 *   "Mantenha seu Amor Aceso",
 *   "Turma 2 — Terças",
 *   "Valor não confere"
 * );
 */
export async function emailPagamentoRecusado(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  motivo: string
) {
  return enviarEmail({
    to: email,
    tipo: "pagamento_recusado",
    nome,
    livro,
    turma,
    motivo,
  });
}

/**
 * Enviar email de inscrição aprovada
 */
export async function emailInscricaoAprovada(
  email: string,
  nome: string,
  livro: string,
  turma: string
) {
  return enviarEmail({
    to: email,
    tipo: "inscricao_aprovada",
    nome,
    livro,
    turma,
  });
}

/**
 * Enviar email de inscrição recusada
 */
export async function emailInscricaoRecusada(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  motivo: string
) {
  return enviarEmail({
    to: email,
    tipo: "inscricao_recusada",
    nome,
    livro,
    turma,
    motivo,
  });
}

/**
 * Enviar email customizado (antes chamada "send-notification-email" para admins)
 */
export async function emailCustomizado(
  email: string,
  nome: string,
  assunto: string,
  mensagem: string
) {
  return enviarEmail({
    to: email,
    tipo: "customizado",
    nome,
    assunto,
    mensagem,
  });
}

/**
 * Enviar email: Curso iniciado! (quando admin libera)
 * @example
 * await emailInicioCurso(
 *   "kelly@email.com",
 *   "Kelly",
 *   "Mantenha seu Amor Aceso",
 *   "Turma 2 — Terças",
 *   "2025-01-15"
 * );
 */
export async function emailInicioCurso(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  dataInicio: string
) {
  return enviarEmail({
    to: email,
    tipo: "curso_iniciado",
    nome,
    livro,
    turma,
    data_inicio: dataInicio,
  });
}
