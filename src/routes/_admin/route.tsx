import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
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
  Award,
  FileText,
  ShieldCheck,
  LogOut,
  GraduationCap,
  BookOpen,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData, error } = await supabase.auth.getUser();
    if (error || !userData.user) throw redirect({ to: "/auth", search: { area: "admin" as const } });

    const { data: role, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "admin_master", "admin_suporte"])
      .maybeSingle();

    if (roleError || !role) throw redirect({ to: "/inicio" });

    return { user: userData.user, role: role.role };
  },
  component: AdminLayout,
});

type MenuItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const menu: MenuItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/participantes", label: "Participantes / CRM", icon: Users },
  { to: "/admin/livros", label: "Livros", icon: BookOpen },
  { to: "/admin/turmas", label: "Turmas", icon: GraduationCap },
  { to: "/admin/eventos", label: "Encontros", icon: Calendar },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/conta", label: "Conta PIX", icon: Wallet },
  { to: "/admin/presencas", label: "Presenças", icon: CheckSquare },
  { to: "/admin/certificados", label: "Certificados", icon: Award },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
];

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Até logo!");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b-2 border-primary bg-primary/10 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-semibold">Book Team</span>
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-widest text-primary-foreground">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/inicio"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
            >
              <GraduationCap className="h-4 w-4" /> Área do aluno
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-2 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gestão
          </p>
          <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {menu.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
