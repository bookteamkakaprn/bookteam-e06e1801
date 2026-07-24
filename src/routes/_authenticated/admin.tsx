import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, BookOpen, Calendar, CreditCard, CheckSquare, Award, FileText, BookMarked } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context: _ctx }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/inicio" });
  },
  component: AdminLayout,
});

const menu = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/participantes", label: "Participantes / CRM", icon: Users },
  { to: "/admin/trilhas", label: "Trilhas", icon: BookMarked },
  { to: "/admin/livros", label: "Livros", icon: BookOpen },
  { to: "/admin/eventos", label: "Encontros", icon: Calendar },
  { to: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/presencas", label: "Presenças", icon: CheckSquare },
  { to: "/admin/certificados", label: "Certificados", icon: Award },
  { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
] as const;

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administração</p>
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
  );
}
