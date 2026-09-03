import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Meu painel — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InicioPage,
});

function InicioPage() {
  const { user } = useAuth();
  const nome = user?.displayName || user?.email || "Aluno";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-background p-6">
        <p className="text-sm text-muted-foreground">Bem-vindo(a) ao painel do aluno</p>
        <h1 className="font-serif text-3xl font-bold">{nome}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Aqui você acompanha suas inscrições, pagamentos, encontros e certificados. Escolha um livro na página inicial e clique em "Quero participar" para se inscrever.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Minhas inscrições</h2>
          <Button asChild size="sm" variant="outline">
            <Link to="/eventos">Ver encontros</Link>
          </Button>
        </div>

        <div className="mt-3 space-y-3">
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 text-sm md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                  <BookOpen className="h-7 w-7" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Sua área do aluno está pronta.</p>
                  <p className="mt-1 text-muted-foreground">
                    Suas inscrições e pagamentos aparecerão aqui assim que você fizer uma inscrição em um encontro.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Encontros</span>
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Jornada de leitura</span>
                  </div>
                </div>
              </div>
              <Button asChild variant="link" className="px-0 md:shrink-0">
                <Link to="/">Ver livros disponíveis</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
