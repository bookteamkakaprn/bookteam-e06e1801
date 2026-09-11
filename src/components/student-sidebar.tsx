import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Clock,
  Calendar,
  CalendarDays,
  FolderOpen,
  MessageSquare,
  History,
  CreditCard,
  Award,
  User,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    to: "/inicio",
    label: "Início",
    icon: LayoutDashboard,
  },
  {
    to: "/minhas-inscricoes",
    label: "Minhas inscrições",
    icon: BookOpen,
  },
  {
    to: "/presenca",
    label: "Presença",
    icon: CheckCircle2,
  },
  {
    to: "/certificados",
    label: "Certificados",
    icon: Award,
  },
  {
    to: "/cursos",
    label: "Cursos",
    icon: GraduationCap,
  },
  {
    to: "/turmas",
    label: "Turmas",
    icon: Clock,
  },
  {
    to: "/eventos",
    label: "Encontros",
    icon: Calendar,
  },
  {
    to: "/calendario",
    label: "Calendário",
    icon: CalendarDays,
  },
  {
    to: "/materiais",
    label: "Materiais",
    icon: FolderOpen,
  },
  {
    to: "/mensagens",
    label: "Fale com ADM",
    icon: MessageSquare,
  },
  {
    to: "/historico",
    label: "Meu histórico",
    icon: History,
  },
  {
    to: "/pagamentos",
    label: "Pagamentos",
    icon: CreditCard,
  },
  {
    to: "/tutorial",
    label: "Tutorial",
    icon: HelpCircle,
  },
  {
    to: "/perfil",
    label: "Perfil",
    icon: User,
  },
];

export function StudentSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-secondary/20">
      <nav className="space-y-1 p-4">
        {navItems.map(({ to, label, icon: Icon, disabled }) => {
          const isActive = pathname === to || pathname.startsWith(to + "/");
          const isDisabled = disabled === true;

          if (isDisabled) {
            return (
              <div
                key={to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-not-allowed opacity-50",
                  "text-muted-foreground"
                )}
                title="Em breve"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
