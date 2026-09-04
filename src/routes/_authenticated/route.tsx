import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { User, Calendar, CalendarDays, CreditCard, Award, LogOut, LayoutDashboard, History, MessageSquare, FolderOpen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import bookTeamLogo from "@/assets/book-team-logo.png";

export const Route = createFileRoute("/_authenticated")({ ssr: false, beforeLoad: async () => { const { data, error } = await supabase.auth.getUser(); if (error || !data.user) throw redirect({ to: "/auth" }); return { user: data.user }; }, component: AuthenticatedLayout });

function AuthenticatedLayout() {
  const { isAdmin, user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); toast.success("Até logo!"); navigate({ to: "/auth", replace: true }); }
  const navItems = [
    { to: "/eventos", label: "Encontros", icon: Calendar },
    { to: "/calendario", label: "Calendário", icon: CalendarDays },
    { to: "/materiais", label: "Materiais", icon: FolderOpen },
    { to: "/mensagens", label: "Fale com ADM", icon: MessageSquare },
    { to: "/historico", label: "Meu histórico", icon: History },
    { to: "/pagamentos", label: "Pagamentos", icon: CreditCard },
    { to: "/certificados", label: "Certificados", icon: Award },
    { to: "/perfil", label: "Perfil", icon: User },
  ] as const;
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Link to="/inicio" className="flex min-w-0 items-center gap-2"><img src={bookTeamLogo} alt="Book Team" className="h-8 w-auto shrink-0 object-contain" /><span className="truncate font-serif text-base font-semibold sm:text-xl">Área do aluno</span></Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2"><span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">{user?.email}</span>{isAdmin && <Link to="/admin" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary sm:px-3 sm:text-sm"><LayoutDashboard className="h-4 w-4" /><span className="hidden sm:inline">Admin</span><span className="sm:hidden">ADM</span></Link>}<Button size="sm" variant="ghost" onClick={signOut} aria-label="Sair"><LogOut className="h-4 w-4" /></Button></div>
        </div>
        <nav aria-label="Navegação da área do aluno" className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto border-t border-border/60 px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link to="/inicio" className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm ${pathname === "/inicio" ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><LayoutDashboard className="h-3.5 w-3.5" />Início</Link>
          {navItems.map(({ to, label, icon: Icon }) => { const active = pathname === to || pathname.startsWith(to + "/"); return <Link key={to} to={to} className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Icon className="h-3.5 w-3.5" />{label}</Link>; })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl min-w-0 px-3 py-4 sm:px-4 sm:py-6"><Outlet /></main>
    </div>
  );
}
