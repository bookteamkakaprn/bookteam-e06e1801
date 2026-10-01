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
  return emailCustomizado(
    email,
    nome,
    "✅ Pagamento aprovado — aguarde a confirmação da vaga",
    "Seu pagamento foi aprovado com sucesso.\n\nCurso: " + livro + "\nTurma: " + turma + "\nValor: R$ " + valor.toFixed(2) + "\n\nA aprovação do pagamento não confirma automaticamente sua vaga. Aguarde a confirmação da inscrição pelo ADM. Você receberá um novo e-mail quando sua vaga for confirmada.\n\nAcesse https://ministeriobookteam.com.br",
  );
}

export function emailPagamentoRecusado(
  email: string, nome: string, livro: string, turma: string, motivo: string,
) {
  return emailCustomizado(
    email,
    nome,
    "⚠️ Pagamento recusado — verifique o motivo",
    "Seu pagamento não foi aprovado.\n\nCurso: " + livro + "\nTurma: " + turma + "\nMotivo: " + motivo + "\n\nEntre no site para verificar o motivo da recusa e as orientações.\n\nhttps://ministeriobookteam.com.br",
  );
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
  const inicio = dataInicio ? new Date(dataInicio + (dataInicio.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "a confirmar";
  const fim = dataFim ? new Date(dataFim + (dataFim.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "";
  return emailCustomizado(
    email,
    nome,
    "🎉 Sua vaga no Book Team foi confirmada!",
    "Sua inscrição foi aprovada e a vaga é sua.\n\nCurso: " + livro + "\nTurma: " + turma + "\nInício: " + inicio + (fim ? "\nTérmino: " + fim : "") + (horario ? "\nHorário: " + horario : "") + "\n\nAs aulas desta turma foram vinculadas ao seu calendário dentro do site.\n\nPara aprovação no curso, é necessário ter no mínimo " + frequenciaMinima + "% de frequência.\n\nAcesse https://ministeriobookteam.com.br",
  );
}

export function emailInscricaoRecusada(
  email: string, nome: string, livro: string, turma: string, motivo: string,
) {
  return emailCustomizado(
    email,
    nome,
    "⚠️ Inscrição não confirmada — vagas encerradas",
    "Infelizmente não foi possível confirmar sua inscrição porque as vagas da turma já foram encerradas.\n\nCurso: " + livro + "\nTurma: " + turma + "\nMotivo: " + motivo + "\n\nSeu pagamento será estornado em até 7 dias.\n\nDúvidas? Acesse o site e fale com o ADM.\n\nhttps://ministeriobookteam.com.br",
  );
}

export function emailFaltaJustificar(
  email: string,
  nome: string,
  livro: string,
  turma: string,
  dataAula: string,
) {
  const data = new Date(dataAula + "T00:00:00").toLocaleDateString("pt-BR");
  return emailCustomizado(
    email,
    nome,
    "📌 Falta registrada — justifique no site",
    "Foi registrada uma ausência na aula de " + data + ".\n\nCurso: " + livro + "\nTurma: " + turma + "\n\nEntre no site e clique no botão do dia da falta para justificar sua ausência.\n\nhttps://ministeriobookteam.com.br",
  );
}

export function emailListaEsperaNovaTurma(
  email: string, nome: string, livro: string, turma: string, dataInicio?: string | null, dataFim?: string | null, horario?: string | null,
) {
  return emailCustomizado(
    email,
    nome,
    "🎉 Nova turma aberta — sua lista de interesse foi atendida",
    "Olá " + nome + ",\n\nUma nova turma foi aberta para o curso " + livro + ".\n\nTurma: " + turma +
      (dataInicio ? "\nInício: " + new Date(dataInicio + (dataInicio.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "") +
      (dataFim ? "\nFim: " + new Date(dataFim + (dataFim.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "") +
      (horario ? "\nHorário: " + horario : "") +
      "\n\nVocê demonstrou interesse neste curso. Acesse o site para verificar a turma e realizar sua inscrição enquanto houver vagas:\nhttps://ministeriobookteam.com.br",
  );
}

export function emailNovaTurma(
  email: string, nome: string, livro: string, turma: string, dataInicio?: string | null, dataFim?: string | null, horario?: string | null,
) {
  const inicio = dataInicio ? new Date(dataInicio + (dataInicio.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "";
  const fim = dataFim ? new Date(dataFim + (dataFim.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "";
  return emailCustomizado(
    email,
    nome,
    "📚 Nova turma disponível no Book Team",
    "Uma nova turma foi aberta.\n\nCurso: " + livro + "\nTurma: " + turma + (inicio ? "\nInício: " + inicio : "") + (fim ? "\nTérmino: " + fim : "") + (horario ? "\nHorário: " + horario : "") + "\n\nEntre no site para consultar os detalhes e se inscrever.\n\nhttps://ministeriobookteam.com.br",
  );
}

export function emailNovoEvento(
  email: string, nome: string, titulo: string, data?: string | null, horario?: string | null, mensagem?: string | null,
) {
  const dataBR = data ? new Date(data + (data.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") : "";
  return emailCustomizado(
    email,
    nome,
    "📣 Novo evento: " + titulo,
    "Novo evento Book Team.\n\nEvento: " + titulo + (dataBR ? "\nData: " + dataBR : "") + (horario ? "\nHorário: " + horario : "") + (mensagem ? "\n\n" + mensagem : "") + "\n\nAcesse https://ministeriobookteam.com.br",
  );
}

export function emailCustomizado(
  email: string, nome: string, assunto: string, mensagem: string,
) {
  return enviarEmail({ to: email, tipo: "customizado", nome, assunto, mensagem });
}

export function emailComprovanteRecebido(
  email: string, nome: string, livro: string, turma: string,
) {
  return emailCustomizado(
    email,
    nome,
    "📄 Comprovante recebido — aguarde a confirmação da vaga",
    "Recebemos o seu comprovante de pagamento.

Curso: " + livro + "\nTurma: " + turma + "\n\nSeu comprovante está em processamento. Em breve informaremos sobre a aprovação do pagamento e a confirmação da sua vaga.\n\nImportante: o envio e a aprovação do pagamento não garantem a vaga. A confirmação da inscrição está condicionada à disponibilidade de vagas na turma e à aprovação da inscrição pelo ADM. Caso as vagas sejam encerradas antes da confirmação da sua inscrição, você receberá uma comunicação sobre o estorno do valor pago.\n\nAguarde a confirmação antes de considerar sua vaga liberada.\n\nAcesse https://ministeriobookteam.com.br",
  );
}

export function emailInicioCurso(
  email: string, nome: string, livro: string, turma: string, dataInicio: string,
) {
  return emailCustomizado(
    email,
    nome,
    "🎉 Parabéns! Você está inscrito no curso",
    "Parabéns, você está inscrito no curso.\n\nCurso: " + livro + "\nTurma: " + turma + "\nInício: " + new Date(dataInicio + (dataInicio.length === 10 ? "T00:00:00" : "")).toLocaleDateString("pt-BR") + "\n\nAcesse o site para consultar os dias, horários e locais das aulas:\nhttps://ministeriobookteam.com.br",
  );
}
