import { supabase } from "@/integrations/supabase/client";

export type EmailTipo =
  | "pagamento_aprovado"
  | "pagamento_recusado"
  | "inscricao_aprovada"
  | "inscricao_recusada"
  | "curso_iniciado"
  | "falta_justificar"
  | "nova_turma"
  | "novo_evento"
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
  data_fim?: string;
  horario?: string;
  frequencia_minima?: number;
  data_aula?: string;
  assunto?: string;
  mensagem?: string;
}

export async function enviarEmail(payload: EmailPayload) {
  const { data, error } = await supabase.functions.invoke(
    "bookteam-send-notification-email",
    { body: payload },
  );
  if (error) {
    console.error("Erro ao enviar email:", error);
    throw error;
  }
  return { success: true, data };
}

export function emailPagamentoAprovado(
  email: string, nome: string, livro: string, turma: string, valor: number,
) {
  return enviarEmail({ to: email, tipo: "pagamento_aprovado", nome, livro, turma, valor });
}

export function emailPagamentoRecusado(
  email: string, nome: string, livro: string, turma: string, motivo: string,
) {
  return enviarEmail({ to: email, tipo: "pagamento_recusado", nome, livro, turma, motivo });
}

export function emailInscricaoAprovada(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  dataInicio?: string | null,
  dataFim?: string | null,
  horario?: string | null,
  frequenciaMinima = 90,
) {
  return enviarEmail({
    to: email,
    tipo: "inscricao_aprovada",
    nome,
    livro,
    turma,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
    horario: horario || undefined,
    frequencia_minima: frequenciaMinima,
  });
}

export function emailInscricaoRecusada(
  email: string, nome: string, livro: string, turma: string, motivo: string,
) {
  return enviarEmail({ to: email, tipo: "inscricao_recusada", nome, livro, turma, motivo });
}

export function emailFaltaJustificar(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  dataAula: string,
) {
  return enviarEmail({
    to: email,
    tipo: "falta_justificar",
    nome,
    livro,
    turma,
    data_aula: dataAula,
  });
}

export function emailNovaTurma(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  dataInicio?: string | null,
  dataFim?: string | null,
  horario?: string | null,
) {
  return enviarEmail({
    to: email,
    tipo: "nova_turma",
    nome,
    livro,
    turma,
    data_inicio: dataInicio || undefined,
    data_fim: dataFim || undefined,
    horario: horario || undefined,
  });
}

export function emailNovoEvento(
  email: string,
  nome: string,
  titulo: string,
  data?: string | null,
  horario?: string | null,
  mensagem?: string | null,
) {
  return enviarEmail({
    to: email,
    tipo: "novo_evento",
    nome,
    assunto: titulo,
    data_inicio: data || undefined,
    horario: horario || undefined,
    mensagem: mensagem || undefined,
  });
}

export function emailCustomizado(
  email: string, nome: string, assunto: string, mensagem: string,
) {
  return enviarEmail({ to: email, tipo: "customizado", nome, assunto, mensagem });
}

export function emailInicioCurso(
  email: string, nome: string, livro: string, turma: string, dataInicio: string,
) {
  return enviarEmail({ to: email, tipo: "curso_iniciado", nome, livro, turma, data_inicio: dataInicio });
}
