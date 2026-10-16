import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { NotificacoesSino } from "@/components/notificacoes-sino";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive,
  Menu,
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  CheckSquare,
  LogOut,
  GraduationCap,
  BookOpen,
  UserPlus,
  ClipboardCheck,
  UserCog,
  FolderOpen,
  ShieldCheck,
  ChevronDown,
  MessageSquare,
  ShoppingCart,
  HelpCircle,
  ListTodo,
} from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data: userData, error } = await supabase.auth.getUser();

    if (error || !userData.user) {
      throw redirect({
        to: "/auth",
        search: { area: "admin" as const },
      });
    }

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !roleError && Boolean(role);

    let permissions: string[] = [];

    if (!isAdmin) {
      const { data: assignment } = await (supabase as any)
        .from("admin_usuario_perfis")
        .select("perfil_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!assignment?.perfil_id) throw redirect({ to: "/inicio" });

      const { data: perfil } = await (supabase as any)
        .from("admin_perfis")
        .select("id, ativo, permissoes")
        .eq("id", assignment.perfil_id)
        .maybeSingle();

      if (!perfil?.ativo) throw redirect({ to: "/inicio" });
      permissions = Array.isArray(perfil.permissoes) ? perfil.permissoes : [];

      const path = location.pathname;
      const permissionByPath: Array<[string, string]> = [
        ["/admin/perfis", "perfis"],
        ["/admin/participantes", "participantes"],
        ["/admin/inscricoes", "inscricoes"],
        ["/admin/livros", "cursos"],
        ["/admin/cadastrar-livro", "cursos"],
        ["/admin/turmas", "turmas"],
        ["/admin/materiais", "materiais"],
        ["/admin/tarefas", "tarefas"],
        ["/admin/estoque", "estoque"],
        ["/admin/visualizacao-turmas", "visualizacao_turmas"],
        ["/admin/pedido-materiais", "pedido_materiais"],
        ["/admin/presencas", "presencas"],
        ["/admin/checklist", "visualizacao_turmas"],
        ["/admin/eventos", "eventos"],
        ["/admin/calendario", "calendario"],
        ["/admin/pagamentos", "pagamentos"],
        ["/admin/comprovantes-arquivo", "pagamentos"],
        ["/admin/configuracoes", "configuracoes"],
        ["/admin/fale-com-adm", "fale_com_adm"],
        ["/admin/tutorial", "tutorial"],
        ["/admin", "visao_geral"],
      ];

      const required = permissionByPath.find(([prefix]) =>
        path === prefix || path.startsWith(prefix + "/"),
      )?.[1];

      if (required && !permissions.includes(required)) {
        const fallback = permissions.includes("visao_geral")
          ? "/admin"
          : "/inicio";
        throw redirect({ to: fallback as any });
      }
    }

    return {
      user: userData.user,
      role: isAdmin ? "admin" : "perfil",
      isAdmin,
      permissions,
    };
  },
  component: AdminLayout,
});

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: string;
  exact?: boolean;
};

const menuPrincipal: MenuItem[] = [
  {
    to: "/admin",
    label: "Visão geral",
    permission: "visao_geral",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/admin/inscricoes",
    label: "Aprovar inscrições e pagamentos",
    permission: "inscricoes",
    icon: ClipboardCheck,
  },
  {
    to: "/admin/livros",
    label: "Cursos",
    permission: "cursos",
    icon: BookOpen,
  },
  {
    to: "/admin/turmas",
    label: "Turmas",
    permission: "turmas",
    icon: GraduationCap,
  },
  {
    to: "/admin/materiais",
    label: "Materiais de aula",
    permission: "materiais",
    icon: FolderOpen,
  },
  {
    to: "/admin/tarefas",
    label: "Tarefas",
    permission: "tarefas",
    icon: ListTodo,
  },
  {
    to: "/admin/estoque",
    label: "Estoque da livraria",
    permission: "estoque",
    icon: ShoppingCart,
  },
  {
    to: "/admin/visualizacao-turmas",
    label: "Visualização de turma + inscritos",
    permission: "visualizacao_turmas",
    icon: Users,
  },
  {
    to: "/admin/pedido-materiais",
    label: "Pedido de materiais",
    permission: "pedido_materiais",
    icon: ShoppingCart,
  },
  {
    to: "/admin/presencas",
    label: "Lista de presença",
    permission: "presencas",
    icon: CheckSquare,
  },
  {
    to: "/admin/checklist",
    label: "Checklist",
    permission: "visualizacao_turmas",
    icon: CheckSquare,
  },
  {
    to: "/admin/eventos",
    label: "Eventos",
    permission: "eventos",
    icon: Calendar,
  },
  {
    to: "/admin/calendario",
    label: "Calendário",
    permission: "calendario",
    icon: Calendar,
  },
  {
    to: "/admin/pagamentos",
    label: "Controle de pagamentos",
    permission: "pagamentos",
    icon: CreditCard,
  },
  {
    to: "/admin/comprovantes-arquivo",
    label: "Arquivo de comprovantes",
    permission: "pagamentos",
    icon: Archive,
  },
  {
    to: "/admin/configuracoes",
    label: "Configurações",
    permission: "configuracoes",
    icon: UserCog,
  },
  {
    to: "/admin/fale-com-adm",
    label: "Fale com ADM",
    permission: "fale_com_adm",
    icon: MessageSquare,
  },
  {
    to: "/admin/tutorial",
    label: "Tutorial",
    permission: "tutorial",
    icon: HelpCircle,
  },
];

function AdminLayout() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const { isAdmin, permissions } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [alunosAberto, setAlunosAberto] = useState(() =>
    pathname.startsWith("/admin/participantes"),
  );
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  // Menu lateral: no celular vira gaveta (aberta pelo hambúrguer); no computador fica fixo.
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Até logo!");
    navigate({ to: "/auth", replace: true });
  }

  const active = (to: string, exact?: boolean) =>
    exact
      ? pathname === to
      : pathname === to || pathname.startsWith(to + "/");

  const pode = (permission: string) =>
    isAdmin || permissions.includes(permission);

  const menuVisivel = menuPrincipal.filter((item) => pode(item.permission));

  const renderItem = (to: string, exact?: boolean) => {
    const item = menuVisivel.find((i) => i.to === to);
    if (!item) return null;
    const Icon = item.icon;
    return (
      <Link
        key={to}
        to={to}
        className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
          active(to, exact)
            ? "bg-primary text-primary-foreground"
            : "text-foreground hover:bg-secondary"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="min-w-0 break-words">{item.label}</span>
      </Link>
    );
  };

  const renderGrupo = (
    id: string,
    rotulo: string,
    Icon: typeof LayoutDashboard,
    tos: string[],
  ) => {
    const itens = tos
      .map((to) => menuVisivel.find((i) => i.to === to))
      .filter((i): i is MenuItem => !!i);
    if (itens.length === 0) return null;

    const dentro = tos.some((to) => active(to));
    const aberto = gruposAbertos[id] ?? dentro;

    return (
      <div key={id}>
        <button
          type="button"
          onClick={() => setGruposAbertos((g) => ({ ...g, [id]: !aberto }))}
          className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
            dentro
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-secondary"
          }`}
        >
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{rotulo}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>

        {aberto && (
          <div className="mt-1 space-y-1 border-l border-border pl-2">
            {itens.map((item) => {
              const SubIcon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    active(item.to)
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <SubIcon className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-muted/30">
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-primary/10 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-2 px-3 sm:px-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate font-serif text-lg font-semibold sm:text-xl">
              Book Team
            </span>
            <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground sm:text-xs">
              Admin
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <NotificacoesSino destinatario="admin" />
            <Button
              size="sm"
              variant="ghost"
              className="lg:hidden"
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link
              to="/inicio"
              className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-foreground hover:bg-secondary sm:gap-1.5 sm:px-3 sm:text-sm"
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Área do aluno</span>
            </Link>

            <Button
              size="sm"
              variant="ghost"
              onClick={signOut}
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {menuAberto && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/50 lg:hidden"
          onClick={() => setMenuAberto(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex min-h-[calc(100vh-64px)] min-w-0 flex-col lg:flex-row">
        <aside
          className={`fixed bottom-0 left-0 top-16 z-40 w-64 max-w-[85vw] overflow-y-auto border-r border-border bg-card p-3 transition-transform duration-200 lg:sticky lg:top-16 lg:z-auto lg:h-[calc(100vh-64px)] lg:w-56 lg:shrink-0 lg:translate-x-0 lg:bg-secondary/20 lg:p-4 ${
            menuAberto ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Área administrativa
          </p>

          <nav className="flex flex-col gap-1">
            {/* 1. Tutorial */}
            {renderItem("/admin/tutorial")}

            {/* 2. Visão geral */}
            {renderItem("/admin", true)}

            {/* 2. Alunos */}
            {pode("participantes") && <div>
              <button
                type="button"
                onClick={() => setAlunosAberto((aberto) => !aberto)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  pathname.startsWith("/admin/participantes")
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Alunos</span>
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform ${
                    alunosAberto ? "rotate-180" : ""
                  }`}
                />
              </button>

              {alunosAberto && (
                <div className="mt-1 space-y-1 border-l border-border pl-2">
                  <Link
                    to="/admin/participantes"
                    className={`flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      active("/admin/participantes")
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Users className="h-4 w-4 shrink-0" />
                    <span>Alunos</span>
                  </Link>

                  <Link
                    to="/admin/participantes"
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    <span>Cadastrar aluno</span>
                  </Link>

                </div>
              )}
            </div>}

            {/* Perfis de acesso — somente ADM */}
            {isAdmin && (
              <Link
                to="/admin/perfis"
                className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active("/admin/perfis")
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Perfis de acesso</span>
              </Link>
            )}

            {/* 5. Cadastro de Cursos */}
            {renderGrupo("cadastro", "Cadastro de Cursos", BookOpen, [
              "/admin/livros",
              "/admin/turmas",
              "/admin/eventos",
              "/admin/calendario",
            ])}

            {/* 6. Materiais */}
            {renderGrupo("materiais", "Materiais", FolderOpen, [
              "/admin/pedido-materiais",
              "/admin/estoque",
            ])}

            {/* 7. Aprovar inscrições e pagamentos */}
            {renderItem("/admin/inscricoes")}

            {/* 8. Turmas e Aulas */}
            {renderGrupo("turmas-aulas", "Turmas e Aulas", GraduationCap, [
              "/admin/visualizacao-turmas",
              "/admin/materiais",
              "/admin/tarefas",
              "/admin/presencas",
              "/admin/checklist",
            ])}

            {/* 9. Financeiro */}
            {renderGrupo("financeiro", "Financeiro", CreditCard, [
              "/admin/pagamentos",
              "/admin/comprovantes-arquivo",
            ])}

            {/* 10. Fale com ADM */}
            {renderItem("/admin/fale-com-adm")}

            {/* 11. Configurações */}
            {renderItem("/admin/configuracoes")}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
