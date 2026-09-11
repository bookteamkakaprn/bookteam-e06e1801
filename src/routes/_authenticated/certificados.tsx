import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Download } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

function CertificadosPage() {
  const { user } = useAuth();

  const { data: inscricoes = [], isLoading } = useQuery({
    queryKey: ["inscricoes-certificado", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("inscricoes")
        .select("id, status")
        .eq("participante_id", user.id)
        .eq("status", "confirmada");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const cursos_completos = inscricoes.length;
  const total_cursos = 10;
  const porcentagem = (cursos_completos / total_cursos) * 100;

  const downloadCertificado = async () => {
    try {
      alert("Certificado pronto para download!");
    } catch (e) {
      alert("Erro ao baixar certificado");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Certificados</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seu progresso e baixe seu certificado
          </p>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Certificados</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu progresso e baixe seu certificado da Jornada Book Team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jornada Book Team — 10 Cursos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barra de Progresso */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Progresso da Jornada</p>
              <p className="text-sm text-muted-foreground">
                {cursos_completos} de {total_cursos} cursos completos
              </p>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {Math.round(porcentagem)}% concluído
            </p>
          </div>

          {/* Mensagem de Conclusão */}
          {cursos_completos === total_cursos ? (
            <div className="rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/10 p-6 text-center">
              <p className="text-lg font-semibold text-green-700">
                ✅ Parabéns! Você completou a Jornada!
              </p>
              <p className="mt-2 text-sm text-green-600">
                Você completou todos os 10 cursos da Jornada Book Team. Seu certificado está pronto para download.
              </p>
              <Button
                onClick={downloadCertificado}
                className="mt-4 gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Baixar Certificado
              </Button>
            </div>
          ) : (
            <div className="rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏳</span>
                <div>
                  <p className="font-semibold text-yellow-700">
                    Faltam {total_cursos - cursos_completos} cursos para completar a jornada
                  </p>
                  <p className="mt-1 text-sm text-yellow-600">
                    O certificado será entregue após completar todos os {total_cursos} cursos. Você já está em {Math.round(porcentagem)}% do caminho! Continue assim! 💪
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Dicas */}
          <div className="space-y-3 rounded-lg border border-border/50 bg-card/50 p-4">
            <p className="text-sm font-semibold">💡 Dicas para Completar</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Participe de todos os encontros da Jornada Book Team</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Chegue no horário para ser marcado como presente</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Acompanhe suas inscrições e pagamentos na seção "Minhas Inscrições"</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Verifique sua presença em cada curso na seção "Presença"</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/certificados")({
  head: () => ({ meta: [{ title: "Certificados — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: CertificadosPage,
});
