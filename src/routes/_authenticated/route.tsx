import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogOut, LayoutDashboard, Menu } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
// Logo agora está em public/book-team-logo.png (caminho público)
const bookTeamLogo = "/book-team-logo.png";
import { StudentSidebar } from "@/components/student-sidebar";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Até logo!");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-2 px-3 sm:px-4">
          {/* Mobile menu toggle */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden"
                aria-label="Menu"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <StudentSidebar />
            </SheetContent>
          </Sheet>

          {/* Logo + Title */}
          <Link
            to="/inicio"
            className="flex min-w-0 items-center gap-2"
            onClick={() => setSidebarOpen(false)}
          >
            <img
              src={bookTeamLogo}
              alt="Book Team"
              className="h-8 w-auto shrink-0 object-contain"
            />
            <span className="truncate font-serif text-base font-semibold sm:text-xl">
              Área do aluno
            </span>
          </Link>

          {/* Right side: Email + Admin + Logout */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground sm:inline">
              {user?.email}
            </span>

            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary sm:px-3 sm:text-sm"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">ADM</span>
              </Link>
            )}

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

      {/* Main layout: Sidebar + Content */}
      <div className="flex min-h-[calc(100vh-64px)]">
        {/* Sidebar (desktop only) */}
        <StudentSidebar />

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="mx-auto w-full px-3 py-4 sm:px-4 sm:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
