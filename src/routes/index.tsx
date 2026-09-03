import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold font-serif mb-4">Book Team</h1>
        <p className="text-xl text-foreground/70 mb-8">
          Bem-vindo ao Ministério de Leitura
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Button asChild size="lg" className="bg-gold text-white hover:bg-gold/90">
            <Link to="/auth" search={{ mode: "signup" }}>Criar Conta</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
