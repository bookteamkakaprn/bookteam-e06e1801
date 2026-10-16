import { createFileRoute } from "@tanstack/react-router";
import { AdminMensagensPage } from "./admin.mensagens";

// Fale com ADM: lê a mesma tabela que o aluno grava (mensagens_admin) e permite responder.
export const Route = createFileRoute("/_admin/admin/fale-com-adm")({
  component: AdminMensagensPage,
});
