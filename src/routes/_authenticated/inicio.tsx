import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, CheckCircle2, Clock, BookOpen, GraduationCap, CreditCard, Award, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Meu painel — Book Team" }, { name: "robots", content: "noindex" }] }),
  component: InicioPage,
});

type Insc = {
  id: string;
  status: string;
  created_at: string;
  evento: { id: string; titulo: string; data: string; hora: string | null; cidade: string | null; local: string | null; livro: { titulo: string; imagem_url: string | null } | null } | null;
  pagamentos: { status: string; created_at: string }[] | null;
};

function statusMeta(i: Insc) {
  if (i.status === "confirmada") return { label: "Confirmada", Icon: CheckCircle2, variant: "default" as const };
  const p = [...(i.pagamentos ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  if (p?.status === "aguardando") return { label: "Em validação", Icon: Clock, variant: "secondary" as const };
  if (p?.status === "rejeitado") return { label: "Não validado", Icon: AlertCircle, variant: "destructive" as const };
  return { label: "Pendente pagamento", Icon: AlertCircle, variant: "outline" as const };
}

function InicioPage() {
  const { user } = useAuth();
  const nome = (user?.user_metadata?.nome as string | undefined) ?? user?.email;

  const { data, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["minhas-inscricoes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("inscricoes")
        .select(
          "id, status, created_at, evento:eventos(id, titulo, data, hora, cidade, local, livro:livros(titulo, imagem_url)), pagamentos(status, created_at)"
        )
        .eq("participante_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as Insc[];
    },
  });

  const inscricoes = data ?? [];

  const quickLinks = [
    { to: "/eventos", label: "Encontros", icon: Calendar, desc: "Ver próximos encontros disponíveis" },
    { to: "/calendario", label: "Calendário", icon: Calendar, desc: "Agenda de encontros confirmados" },
    { to: "/historico", label: "Meu histórico", icon: History, desc: "Registrar livros feitos anteriormente" },
    { to: "/pagamentos", label: "Pagamentos", icon: CreditCard, desc: "Comprovantes e situação financeira" },
    { to: "/certificados", label: "Certificados", icon: Award, desc: "Certificados emitidos" },
  ];

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
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && inscricoes.length === 0 && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">Você ainda não se inscreveu em nenhum curso.</p>
                  <p>Escolha um livro na trilha e faça sua inscrição.</p>
                </div>
                <Button asChild variant="link" className="px-0">
                  <Link to="/">Ver livros disponíveis</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {inscricoes.map((i) => {
            const meta = statusMeta(i);
            const Icon = meta.Icon;
            const ev = i.evento;
            if (!ev) return null;
            return (
              <Card key={i.id} className="overflow-hidden">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    {ev.livro?.imagem_url ? (
                      <img src={ev.livro.imagem_url} alt={ev.livro.titulo} className="h-20 w-14 rounded object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-20 w-14 items-center justify-center rounded bg-muted">
                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-serif text-lg font-semibold">{ev.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="mr-1 inline h-3.5 w-3.5" />
                        {new Date(ev.data + "T00:00:00").toLocaleDateString("pt-BR")} {ev.hora?.slice(0, 5)}
                        {(ev.local || ev.cidade) && ` — ${[ev.local, ev.cidade].filter(Boolean).join(", ")}`}
                      </p>
                      {ev.livro?.titulo && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          <GraduationCap className="mr-1 inline h-3.5 w-3.5" /> {ev.livro.titulo}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={meta.variant} className="inline-flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/inscricao/$eventoId" params={{ eventoId: ev.id }}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-xl font-semibold">Atalhos rápidos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ to, label, icon: Icon, desc }) => (
            <Card key={to} className="transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <Link to={to} className="flex items-start gap-3">
                  <div className="rounded-md bg-secondary p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
