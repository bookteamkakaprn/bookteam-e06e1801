import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarDays,
  FolderOpen,
  MessageSquare,
  History,
  Award,
  User,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Clock,
  ListTodo,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export function StudentSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [perfilAberto, setPerfilAberto] = useState(() =>
    pathname === "/perfil" || pathname.startsWith("/historico"),
  );
  const [inscricoesAbertas, setInscricoesAbertas] = useState(() =>
    pathname === "/minhas-inscricoes" || pathname.startsWith("/pagamentos"),
  );

  const linkClass = (to: string) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
      pathname === to || pathname.startsWith(to + "/")
        ? "bg-primary text-primary-foreground font-semibold"
        : "text-foreground hover:bg-secondary",
    );

  const subLinkClass = (to: string) =>
    cn(
      "flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
      pathname === to || pathname.startsWith(to + "/")
        ? "bg-secondary text-foreground font-semibold"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
    );

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-secondary/20">
      <nav className="space-y-1 p-4">
        {/* 1. Perfil */}
        <div>
          <button
            type="button"
            onClick={() => setPerfilAberto((aberto) => !aberto)}
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/perfil" || pathname.startsWith("/historico")
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <span className="flex items-center gap-3">
              <User className="h-4 w-4 shrink-0" />
              <span>Perfil</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                perfilAberto && "rotate-180",
              )}
            />
          </button>

          {perfilAberto && (
            <div className="mt-1 space-y-1 border-l border-border pl-2">
              <Link to="/perfil" className={subLinkClass("/perfil")}>
                <User className="h-4 w-4 shrink-0" />
                <span>Perfil</span>
              </Link>
              <Link to="/historico" className={subLinkClass("/historico")}>
                <History className="h-4 w-4 shrink-0" />
                <span>Meu histórico</span>
              </Link>
            </div>
          )}
        </div>

        {/* 2. Tutorial */}
        <Link to="/tutorial" className={linkClass("/tutorial")}>
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Tutorial</span>
        </Link>

        {/* 3. Calendário */}
        <Link to="/calendario" className={linkClass("/calendario")}>
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span>Calendário</span>
        </Link>

        {/* 4. Cursos */}
        <Link to="/cursos" className={linkClass("/cursos")}>
          <GraduationCap className="h-4 w-4 shrink-0" />
          <span>Cursos</span>
        </Link>

        {/* 5. Turmas */}
        <Link to="/turmas" className={linkClass("/turmas")}>
          <Clock className="h-4 w-4 shrink-0" />
          <span>Turmas</span>
        </Link>

        {/* 6. Encontros */}
        <Link to="/eventos" className={linkClass("/eventos")}>
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Encontros</span>
        </Link>

        {/* 7. Minhas inscrições + Pagamentos */}
        <div>
          <button
            type="button"
            onClick={() => setInscricoesAbertas((aberto) => !aberto)}
            className={cn(
              "flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === "/minhas-inscricoes" || pathname.startsWith("/pagamentos")
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-foreground hover:bg-secondary",
            )}
          >
            <span className="flex items-center gap-3">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>Minhas inscrições</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                inscricoesAbertas && "rotate-180",
              )}
            />
          </button>

          {inscricoesAbertas && (
            <div className="mt-1 space-y-1 border-l border-border pl-2">
              <Link to="/minhas-inscricoes" className={subLinkClass("/minhas-inscricoes")}>
                <BookOpen className="h-4 w-4 shrink-0" />
                <span>Minhas inscrições</span>
              </Link>
              <Link to="/pagamentos" className={subLinkClass("/pagamentos")}>
                <span className="h-4 w-4 shrink-0 text-center text-xs font-bold">R$</span>
                <span>Pagamentos</span>
              </Link>
            </div>
          )}
        </div>

        {/* 8. Materiais */}
        <Link to="/materiais" className={linkClass("/materiais")}>
          <FolderOpen className="h-4 w-4 shrink-0" />
          <span>Materiais</span>
        </Link>

        {/* 9. Tarefas */}
        <Link to="/tarefas" className={linkClass("/tarefas")}>
          <ListTodo className="h-4 w-4 shrink-0" />
          <span>Tarefas</span>
        </Link>

        {/* 10. Presença */}
        <Link to="/presenca" className={linkClass("/presenca")}>
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Presença</span>
        </Link>

        {/* 11. Certificados */}
        <Link to="/certificados" className={linkClass("/certificados")}>
          <Award className="h-4 w-4 shrink-0" />
          <span>Certificados</span>
        </Link>

        {/* 12. Fale com ADM */}
        <Link to="/mensagens" className={linkClass("/mensagens")}>
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span>Fale com ADM</span>
        </Link>
      </nav>
    </aside>
  );
}
