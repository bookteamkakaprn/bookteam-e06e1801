import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { auth } from "@/firebase";
import { signOut as firebaseSignOut } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Home, User, Calendar, CalendarDays, CreditCard, Award, LogOut, LayoutDashboard, History } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const logo = "/book-team-logo.png";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = auth.currentUser;
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    try {
      await qc.cancelQueries();
      qc.clear();
      await firebaseSignOut(auth);
      toast.success("Até logo!");
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error("Erro ao sair");
      console.error(error);
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { to: "/inicio", label: "Início", icon: Home },
    { to: "/eventos", label: "Encontros", icon: Calendar },
    { to: "/calendario", label: "Calendário", icon: CalendarDays },
    { to: "/historico", label: "Meu histórico", icon: History },
    { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
    { to: "/certificados", label: "Certificados", icon: Award },
    { to: "/perfil", label: "Perfil", icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/inicio" className="flex items-center gap-2">
            <img src={logo} alt="Book Team" className="h-8 w-auto" />
            <span className="font-serif text-xl font-semibold">Book Clube</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => {
              const active = pathname === to || pathname.startsWith(to + "/");
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto border-t border-border/60 px-2 py-2 md:hidden">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
