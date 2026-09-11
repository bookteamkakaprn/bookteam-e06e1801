import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Users, CheckCircle2, Settings, BookOpen, ShoppingCart } from "lucide-react";

function AdminTutorialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Tutorial Admin — Guia Completo</h1>
        <p className="text-sm text-muted-foreground">
          Como gerenciar a plataforma Book Team e oferecer a melhor experiência aos alunos
        </p>
      </div>

      {/* VISÃO GERAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold" />
            Bem-vindo ao Admin Book Team!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você tem acesso completo para gerenciar cursos, alunos, pagamentos e materiais. Vamos conhecer cada seção:
          </p>
          <div className="rounded-lg bg-gold/10 p-4 text-sm">
            <p className="font-semibold text-gold mb-2">💡 Dica:</p>
            <p className="text-foreground/80">
              Use o menu lateral para navegar entre as funcionalidades. Sempre verifique a "Visão Geral" para ter uma
              snapshot dos números.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* VISÃO GERAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            📊 Visão Geral (Dashboard)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Página inicial com resumo de todos os números importantes.
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">👥 Alunos:</span> Quantos alunos estão no sistema
            </div>
            <div>
              <span className="font-semibold">🗓️ Turmas:</span> Quantidade de turmas ativas
            </div>
            <div>
              <span className="font-semibold">📚 Livros e cursos:</span> Total de cursos publicados
            </div>
            <div>
              <span className="font-semibold">📅 Eventos futuros:</span> Encontros agendados
            </div>
            <div>
              <span className="font-semibold">💳 Pagamentos:</span> Status e valores recebidos
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold text-sm mb-2">O que fazer:</p>
            <p className="text-sm text-muted-foreground">
              Consulte regularmente para acompanhar a saúde da plataforma. Use como base para decisões estratégicas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* APROVAR INSCRIÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            ✅ Aprovar Inscrições / Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Central de aprovação de inscrições e confirmação de pagamentos.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Filtrar:</strong> Veja inscrições pendentes, em espera ou com problemas
            </p>
            <p>
              <strong>Revisar:</strong> Verifique dados do aluno e comprovante de pagamento
            </p>
            <p>
              <strong>Aprovar:</strong> Clique "Aprovar inscrição" para confirmar
            </p>
            <p>
              <strong>Recusar:</strong> Se algo estiver errado, recuse e avise o aluno
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-sm border border-green-200">
            <p className="font-semibold text-green-900 mb-1">📌 Fluxo de aprovação:</p>
            <p className="text-green-800">
              1. Aluno se inscreve → 2. Você aprova inscrição → 3. Aluno paga → 4. Você confirma pagamento → 5. Aluno pode participar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CURSOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />
            📖 Cursos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gerencie todos os cursos (criar, editar, publicar, despublicar).
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Criar curso:</strong> Clique em "Novo curso" e preencha informações
            </p>
            <p>
              <strong>Editar:</strong> Mude título, descrição, categoria, status
            </p>
            <p>
              <strong>Ativo/Inativo:</strong> Controle quais cursos aparecem para alunos
            </p>
            <p>
              <strong>Upload de capa:</strong> Adicione imagem do livro/curso
            </p>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold text-sm mb-2">⚙️ Campos importantes:</p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li><strong>Título:</strong> Nome do curso (ex: "Consórcio - Fundamentos")</li>
              <li><strong>Categoria:</strong> Organize em grupos (ex: "Finanças", "Desenvolvimento")</li>
              <li><strong>Descrição:</strong> Detalhes do que será ensinado</li>
              <li><strong>Capa:</strong> Imagem de capa do livro/curso</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* TURMAS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-500" />
            🗓️ Turmas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Agende encontros e gerencie turmas de cada curso.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Criar turma:</strong> Selecione curso e defina data/horário
            </p>
            <p>
              <strong>Vagas:</strong> Quantas pessoas podem participar
            </p>
            <p>
              <strong>Local:</strong> Onde o encontro vai acontecer (endereço)
            </p>
            <p>
              <strong>Status:</strong> Aberta, em andamento, concluída
            </p>
          </div>
          <div className="rounded-lg bg-cyan-50 p-3 text-sm border border-cyan-200">
            <p className="font-semibold text-cyan-900 mb-1">💡 Exemplo:</p>
            <p className="text-cyan-800">
              Curso "Consórcio 101" → Turma 1 (10/09 às 19h, São Paulo) + Turma 2 (15/09 às 10h, Curitiba)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MATERIAIS DOS CURSOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            📄 Materiais dos Cursos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload de apostilas, PDFs e arquivos de estudo para cada módulo.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Selecione curso:</strong> Escolha para qual curso será o material
            </p>
            <p>
              <strong>Escolha módulo:</strong> Aula 1, Aula 2, etc (ou núm. do módulo)
            </p>
            <p>
              <strong>Título:</strong> Nome descritivo (ex: "Apostila Aula 3")
            </p>
            <p>
              <strong>Arquivo:</strong> Upload do PDF, DOC, ZIP, etc (máx 5MB)
            </p>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold text-sm mb-2">📌 Dica:</p>
            <p className="text-sm text-muted-foreground">
              Organize por módulo para alunos encontrarem facilmente. Nomeie descritivamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PEDIDO DE MATERIAIS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-red-500" />
            🛒 Pedido de Materiais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gerencie pedidos de materiais físicos que alunos precisam comprar (livros, agendas, etc).
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Selecione curso:</strong> Qual curso terá materiais de compra
            </p>
            <p>
              <strong>Adicione materiais:</strong> Livro, agenda, caneta, etc
            </p>
            <p>
              <strong>Ver alunos inscritos:</strong> Crie pedidos para cada um
            </p>
            <p>
              <strong>Rastrear status:</strong> Pendente, Entregue, Cancelado
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-sm border border-red-200">
            <p className="font-semibold text-red-900 mb-1">📌 Fluxo:</p>
            <p className="text-red-800">
              1. Adicione os materiais do curso → 2. Crie pedidos para alunos → 3. Marque como "Entregue" quando receberem
            </p>
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE PRESENÇA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            ✅ Lista de Presença
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Marque presença de alunos em cada encontro.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Selecione turma:</strong> Qual encontro você quer marcar presença
            </p>
            <p>
              <strong>Veja alunos inscritos:</strong> Lista de quem deveria estar lá
            </p>
            <p>
              <strong>Marque presença:</strong> ✅ Presente ou ❌ Ausente
            </p>
            <p>
              <strong>Salve:</strong> Sistema registra automaticamente
            </p>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold text-sm mb-2">📌 Importante:</p>
            <p className="text-sm text-muted-foreground">
              Marque presença em CADA encontro! Isso é essencial para calcular se aluno cumpriu os 80% necessários para certificado.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PAGAMENTOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💳 Controle de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acompanhe todos os pagamentos recebidos e pendentes.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong> Aprovado, Recusado, Pendente
            </p>
            <p>
              <strong>Valor:</strong> Quanto foi pago
            </p>
            <p>
              <strong>Data:</strong> Quando recebeu
            </p>
            <p>
              <strong>Método:</strong> Como foi pago (PIX, cartão, boleto)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CONFIGURAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ⚙️ Configurações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ajustes gerais da plataforma.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Informações da empresa:</strong> Nome, logo, contato
            </p>
            <p>
              <strong>Emails:</strong> Configurar notificações automáticas
            </p>
            <p>
              <strong>Segurança:</strong> Senhas, permissões, backups
            </p>
            <p>
              <strong>Integrações:</strong> Conectar com otros sistemas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* DICAS FINAIS */}
      <Card className="border-gold bg-gold/5">
        <CardHeader>
          <CardTitle className="text-gold">✨ Checklist Diário Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Manhã:</strong> Verifique "Visão Geral" para números importantes</p>
          <p>✅ <strong>Manhã:</strong> Aprove inscrições e pagamentos pendentes</p>
          <p>✅ <strong>Tarde:</strong> Marque presença dos encontros de hoje</p>
          <p>✅ <strong>Fim do dia:</strong> Responda mensagens em "Fale com ADM"</p>
          <p>✅ <strong>Semanal:</strong> Agencie novos cursos e turmas</p>
          <p>✅ <strong>Mensal:</strong> Revise relatório de pagamentos e certificados</p>
        </CardContent>
      </Card>

      {/* FALE COM ADM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💬 Fale com ADM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Canal de mensagens com alunos e membros da equipe.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Receba mensagens:</strong> De alunos com dúvidas
            </p>
            <p>
              <strong>Responda rápido:</strong> Melhor atendimento = mais satisfação
            </p>
            <p>
              <strong>Organize:</strong> Marque como resolvido quando finalizar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ACESSO RÁPIDO */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">🚀 Atalhos Úteis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Alunos:</strong> Clique em "Alunos" para ver perfis e histórico</p>
          <p><strong>Calendário:</strong> Veja todos os eventos agendados em um mês</p>
          <p><strong>Eventos:</strong> Gerencie encontros presenciais e online</p>
          <p><strong>Materiais:</strong> Upload de apostilas e PDFs para cursos</p>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_admin/admin/tutorial")({
  head: () => ({ meta: [{ title: "Tutorial Admin — Book Team" }] }),
  component: AdminTutorialPage,
});
