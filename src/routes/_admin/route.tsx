import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutDashboard, Users, Calendar, CreditCard, CheckSquare, Award, FileText, ShieldCheck, LogOut, GraduationCap, BookOpen, Wallet, UserPlus, ClipboardCheck, UserCog } from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) throw redirect({ to: "/auth", search: { area: "admin" as const } });
    const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (roleError || !role) throw redirect({ to: "/inicio" });
    return { user: userData.user, role: role.role };
  },
  component: AdminLayout,
});

type MenuItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const menu: MenuItem[] = [
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/participantes", label: "Alunos", icon: Users },
  { to: "/admin/participantes", label: "Cadastrar aluno", icon: UserPlus },
  { to: "/admin/participantes", label: "Aprovar inscrições", icon: ClipboardCheck },
  { to: "/admin/participantes", label: "Perfis / ADM", icon: UserCog },
  { to: "/admin/livros", label: "Livros e cursos", icon: BookOpen },
  { to: "/admin/turmas", label: "Ver turmas", icon: GraduationCap },
  { to: "/admin/eventos", label: "Cadastrar evento", icon: Calendar },
  { to: "/admin/pagamentos", label: "Aprovar pagamentos", icon: CreditCard },
  { to: "/admin/conta", label: "Conta PIX", icon: Wallet },
  { to: "/admin/presencas", label: "Presenças", icon: CheckSquare },
  { to: "/admin/certificados", label: "Certificados", icon: Award },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); toast.success("Até logo!"); navigate({ to: "/auth", replace: true }); }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-muted/30">
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-primary/10 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-6 w-6 shrink-0 text-primary" />
            <span className="truncate font-serif text-lg font-semibold sm:text-xl">Book Team</span>
            <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground sm:text-xs">Admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/inicio" className="inline-flex min-h-10 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs text-foreground hover:bg-secondary sm:gap-1.5 sm:px-3 sm:text-sm">
              <GraduationCap className="h-4 w-4 shrink-0" /><span>Área do aluno</span>
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut} aria-label="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid min-w-0 max-w-6xl gap-4 px-3 py-5 sm:gap-6 sm:px-4 sm:py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Área administrativa</p>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-col">
            {menu.map(({ to, label, icon: Icon, exact }, index) => {
              const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
              return <Link key={`${to}-${label}-${index}`} to={to} className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-center text-xs leading-tight transition-colors sm:text-sm lg:justify-start lg:px-3 ${active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}`}>
                <Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{label}</span>
              </Link>;
            })}
          </nav>
        </aside>
        <main className="min-w-0 overflow-hidden"><Outlet /></main>
      </div>
    </div>
  );
}
