import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
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
} from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
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

    if (roleError || !role) {
      throw redirect({ to: "/inicio" });
    }

    return {
      user: userData.user,
      role: role.role,
    };
  },
  component: AdminLayout,
});

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const menuPrincipal: MenuItem[] = [
  {
    to: "/admin",
    label: "Visão geral",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/admin/inscricoes",
    label: "Aprovar inscrições / pagamentos",
    icon: ClipboardCheck,
  },
  {
    to: "/admin/livros",
    label: "Cursos",
    icon: BookOpen,
  },
  {
    to: "/admin/turmas",
    label: "Turmas",
    icon: GraduationCap,
  },
  {
    to: "/admin/materiais",
    label: "Materiais dos cursos",
    icon: FolderOpen,
  },
  {
    to: "/admin/presencas",
    label: "Lista de presença",
    icon: CheckSquare,
  },
  {
    to: "/admin/eventos",
    label: "Eventos",
    icon: Calendar,
  },
  {
    to: "/admin/calendario",
    label: "Calendário",
    icon: Calendar,
  },
  {
    to: "/admin/pagamentos",
    label: "Controle de pagamentos",
    icon: CreditCard,
  },
  {
    to: "/admin/configuracoes",
    label: "Configurações",
    icon: UserCog,
  },
];

function AdminLayout() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const navigate = useNavigate();
  const qc = useQueryClient();

  const [alunosAberto, setAlunosAberto] = useState(() =>
    pathname.startsWith("/admin/participantes"),
  );

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

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-muted/30">
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-primary/10 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
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

      <div className="mx-auto grid min-w-0 max-w-6xl gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Área administrativa
          </p>

          <nav className="flex flex-col gap-1">
            {/* 1. Visão geral */}
            <Link
              to="/admin"
              className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active("/admin", true)
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Visão geral</span>
            </Link>

            {/* 2. Alunos */}
            <div>
              <button
                type="button"
                onClick={() => setAlunosAberto((aberto) => !aberto)}
                className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
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

                  <Link
                    to="/admin/participantes"
                    className="flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <UserCog className="h-4 w-4 shrink-0" />
                    <span>Perfis / ADM</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Demais itens principais */}
            {menuPrincipal.slice(1).map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active(to)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
