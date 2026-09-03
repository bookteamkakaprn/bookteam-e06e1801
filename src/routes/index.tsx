import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <div style={{ maxWidth: "600px", padding: "20px" }}>
        <h1 style={{ fontSize: "48px", marginBottom: "20px", fontWeight: "bold" }}>Book Team</h1>
        <p style={{ fontSize: "18px", marginBottom: "30px", color: "#999" }}>
          Bem-vindo ao Ministério de Leitura
        </p>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link 
            to="/auth" 
            search={{ mode: "signup" }}
            style={{ padding: "12px 24px", backgroundColor: "#d4af37", color: "white", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }}
          >
            Criar Conta
          </Link>
          <Link 
            to="/auth"
            style={{ padding: "12px 24px", border: "1px solid #d4af37", color: "#d4af37", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }}
          >
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
