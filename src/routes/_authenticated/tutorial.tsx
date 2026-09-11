import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, BookOpen, CheckCircle2, Award, Zap, Mail } from "lucide-react";

function TutorialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tutorial — Como Usar</h1>
        <p className="text-sm text-muted-foreground">
          Guia completo para aproveitar melhor a Jornada Book Team
        </p>
      </div>

      {/* VISÃO GERAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold" />
            Bem-vindo à Jornada Book Team!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você está na <strong>Área do Aluno</strong>. Aqui você pode acompanhar suas inscrições,
            presença, certificados e muito mais. Vamos conhecer cada seção:
          </p>
          <div className="rounded-lg bg-gold/10 p-4 text-sm">
            <p className="font-semibold text-gold mb-2">💡 Dica:</p>
            <p className="text-foreground/80">
              Use o menu lateral para navegar entre as abas. Em celular, clique no ☰ (menu) no topo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MINHAS INSCRIÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            📚 Minhas Inscrições
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Aqui você vê TODOS os cursos em que se inscreveu.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <Badge className="bg-amber-600">Aguardando</Badge>
              <span>Sua inscrição foi enviada, mas ainda não foi aprovada</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-blue-600">Participando</Badge>
              <span>Você foi aprovado e o curso já começou</span>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-green-600">Confirmada</Badge>
              <span>Pagamento confirmado, você está 100% inscrito!</span>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="font-semibold text-sm mb-2">O que fazer em cada status:</p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li><strong>Aguardando:</strong> Aguarde a aprovação do admin</li>
              <li><strong>Participando:</strong> Compareça aos encontros</li>
              <li><strong>Confirmada:</strong> Acesse materiais e participe ativamente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* PRESENÇA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            ✅ Presença
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acompanhe sua presença em cada curso.
          </p>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">✅ Presente</span> — Você compareceu ao encontro
            </div>
            <div>
              <span className="font-semibold">❌ Ausente</span> — Você não compareceu
            </div>
            <div>
              <span className="font-semibold">⚫ Não marcado</span> — O encontro ainda não aconteceu
            </div>
          </div>
          <div className="rounded-lg bg-green-50 p-3 text-sm border border-green-200">
            <p className="font-semibold text-green-900 mb-1">📌 Importante:</p>
            <p className="text-green-800">
              Compareça a TODOS os encontros para ganhar o certificado! Mínimo obrigatório: 80% de presença.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CERTIFICADOS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            🏆 Certificados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acompanhe seu progresso e baixe seus certificados.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Barra de Progresso:</strong> Mostra quantos cursos você completou (ex: 2 de 10)
            </p>
            <p>
              <strong>Porcentagem:</strong> Seu percentual de conclusão
            </p>
            <p>
              <strong>Botão Download:</strong> Aparece quando você completa 10 cursos!
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3 text-sm border border-amber-200">
            <p className="font-semibold text-amber-900 mb-1">🎯 Meta:</p>
            <p className="text-amber-800">
              Complete os 10 cursos da Jornada Book Team para ganhar seu certificado especial!
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
            Navegue por TODOS os cursos disponíveis e se inscreva em novos.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Busque por categoria:</strong> Filtrar cursos por tema
            </p>
            <p>
              <strong>Veja informações:</strong> Descrição, turmas disponíveis, materiais
            </p>
            <p>
              <strong>Se inscreva:</strong> Clique em "Participar" para se inscrever
            </p>
          </div>
        </CardContent>
      </Card>

      {/* TURMAS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            🗓️ Turmas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Veja os encontros agendados de cada curso (datas, horários, locais).
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Data:</strong> Quando o encontro acontece
            </p>
            <p>
              <strong>Horário:</strong> Que horas começa e termina
            </p>
            <p>
              <strong>Local:</strong> Onde vocês vão se encontrar
            </p>
            <p>
              <strong>Vagas:</strong> Quantas pessoas podem participar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ENCONTROS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-pink-500" />
            🤝 Encontros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Calendário de TODOS os encontros presenciais programados.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Vista geral:</strong> Veja todos os eventos do mês
            </p>
            <p>
              <strong>Detalhes:</strong> Clique em um dia para ver os encontros agendados
            </p>
            <p>
              <strong>Planeje:</strong> Organize sua agenda com antecedência
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MATERIAIS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-500" />
            📄 Materiais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Acesse apostilas, PDFs e materiais de estudo de seus cursos.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Organize por módulo:</strong> Cada aula tem seus próprios materiais
            </p>
            <p>
              <strong>Baixe:</strong> Clique no arquivo para baixar
            </p>
            <p>
              <strong>Acesso rápido:</strong> Sempre disponível na sua Área do Aluno
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FALE COM ADM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-red-500" />
            💬 Fale com ADM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tire dúvidas e envie mensagens para o administrador.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Escreva sua mensagem:</strong> Deixe sua pergunta ou comentário
            </p>
            <p>
              <strong>Envie:</strong> Clique em "Enviar" para contactar o admin
            </p>
            <p>
              <strong>Aguarde:</strong> O admin responderá assim que possível
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PAGAMENTOS */}
      <Card>
        <CardHeader>
          <CardTitle>💳 Pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Histórico de pagamentos e faturas de seus cursos.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Status:</strong> Veja se pagamento foi aprovado ou recusado
            </p>
            <p>
              <strong>Detalhes:</strong> Valor, data, método de pagamento
            </p>
            <p>
              <strong>Reenviar:</strong> Reenvie comprovante se necessário
            </p>
          </div>
        </CardContent>
      </Card>

      {/* MÍO HISTÓRICO */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Meu Histórico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Resumo completo de tudo que você fez na plataforma.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Cursos completados:</strong> Quantos você terminou
            </p>
            <p>
              <strong>Certificados:</strong> Quais você conquistou
            </p>
            <p>
              <strong>Timeline:</strong> Cronograma de suas atividades
            </p>
          </div>
        </CardContent>
      </Card>

      {/* DICAS FINAIS */}
      <Card className="border-gold bg-gold/5">
        <CardHeader>
          <CardTitle className="text-gold">✨ Dicas Finais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>✅ <strong>Acesse regularmente</strong> para não perder nenhum encontro</p>
          <p>✅ <strong>Marque seus compromissos</strong> no calendário pessoal</p>
          <p>✅ <strong>Baixe os materiais</strong> assim que forem publicados</p>
          <p>✅ <strong>Compareça a todos os encontros</strong> (mínimo 80%)</p>
          <p>✅ <strong>Conclua os 10 cursos</strong> para ganhar o certificado final</p>
          <p>✅ <strong>Dúvidas?</strong> Use "Fale com ADM" para contactar a equipe</p>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/tutorial")({
  head: () => ({ meta: [{ title: "Tutorial — Book Team" }] }),
  component: TutorialPage,
});
