import { supabase } from "@/integrations/supabase/client";
import { buscarNotificacoesPendentes, marcarNotificacaoEnviada, enviarNotificacaoTurmaAberta } from "./notificacoes-turmas";

interface Livro {
  id: string;
  titulo: string;
}

interface Turma {
  id: string;
  nome: string;
  livro_id: string;
  data_inicio: string | null;
}

/**
 * Enviar notificações para todos os alunos que se inscrever
 * quando uma turma é aberta
 */
export async function notificarAlunosssobreTurmaAberta(turmaId: string): Promise<{
  sucesso: number;
  erro: number;
  detalhes: string[];
}> {
  try {
    // 1. Buscar dados da turma
    const { data: turma, error: erroTurma } = await supabase
      .from("turmas")
      .select("id, nome, livro_id, data_inicio")
      .eq("id", turmaId)
      .maybeSingle();

    if (erroTurma || !turma) {
      throw new Error("Turma não encontrada");
    }

    // 2. Buscar dados do livro
    const { data: livro, error: erroLivro } = await supabase
      .from("livros")
      .select("id, titulo")
      .eq("id", turma.livro_id)
      .maybeSingle();

    if (erroLivro || !livro) {
      throw new Error("Livro não encontrado");
    }

    // 3. Buscar todas as notificações pendentes para este livro
    const notificacoes = await buscarNotificacoesPendentes(turma.livro_id);

    if (notificacoes.length === 0) {
      return {
        sucesso: 0,
        erro: 0,
        detalhes: ["Nenhum aluno se inscreveu para ser notificado."],
      };
    }

    // 4. Buscar emails dos participantes
    const { data: participantes, error: erroParticipantes } = await supabase
      .from("participantes")
      .select("id, email, nome_completo")
      .in(
        "id",
        notificacoes.map((n) => n.participante_id)
      );

    if (erroParticipantes) {
      throw new Error("Erro ao buscar participantes");
    }

    let sucesso = 0;
    let erro = 0;
    const detalhes: string[] = [];

    // 5. Enviar email para cada participante
    for (const notificacao of notificacoes) {
      const participante = participantes?.find(
        (p) => p.id === notificacao.participante_id
      );

      if (!participante?.email) {
        erro++;
        detalhes.push(`❌ Participante ${participante?.nome_completo || "desconhecido"} sem email`);
        continue;
      }

      try {
        await enviarNotificacaoTurmaAberta(
          participante.email,
          participante.nome_completo || "Aluno",
          livro.titulo,
          turma.nome,
          turma.data_inicio || ""
        );

        // Marcar como notificado
        await marcarNotificacaoEnviada(notificacao.id);

        sucesso++;
        detalhes.push(`✅ Email enviado para ${participante.nome_completo}`);
      } catch (erroEmail) {
        erro++;
        detalhes.push(
          `❌ Erro ao enviar para ${participante.nome_completo}: ${erroEmail instanceof Error ? erroEmail.message : "erro desconhecido"}`
        );
      }
    }

    return {
      sucesso,
      erro,
      detalhes,
    };
  } catch (erro) {
    throw new Error(
      `Erro ao notificar alunos: ${erro instanceof Error ? erro.message : "erro desconhecido"}`
    );
  }
}
