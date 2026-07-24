import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Award } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Meu painel — Book Clube" }, { name: "robots", content: "noindex" }] }),
  component: InicioPage,
});

function InicioPage() {
  const { user } = useAuth();
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Olá,</p>
        <h1 className="font-serif text-3xl font-bold">{nome}</h1>
        <p className="mt-1 text-muted-foreground">Bem-vindo à sua área do Book Clube.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo encontro</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhum encontro agendado.</p>
            <Button asChild size="sm" variant="link" className="mt-2 px-0">
              <Link to="/eventos">Ver encontros</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trilha atual</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Escolha uma trilha para começar sua jornada.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Você ainda não possui certificados.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
