import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, FormEvent } from "react";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import bookTeamLogo from "@/assets/book-team-logo.png";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "forgot"]).optional(),
});

// Validation schemas
const signupSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().min(11, "CPF inválido"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  estado: z.string().min(2, "Estado obrigatório"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  lgpd: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar os termos LGPD",
  }),
});

const signinSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Senha obrigatória"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => searchSchema.parse(search),
  beforeLoad: async ({ context }) => {
    // Check if user is already authenticated
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: "/inicio" });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const mode = search.mode || "signin";
  const navigate = useNavigate();
  const { signup, login, loading } = useAuth();

  const [signupData, setSignupData] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    senha: "",
    lgpd: false,
  });

  const [signinData, setSigninData] = useState({
    email: "",
    senha: "",
  });

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      signupSchema.parse(signupData);
      
      const result = await signup(signupData.email, signupData.senha, {
        nome: signupData.nome,
        cpf: signupData.cpf,
        telefone: signupData.telefone,
        cidade: signupData.cidade,
        estado: signupData.estado,
        aceite_lgpd: signupData.lgpd,
      });

      if (result.success) {
        navigate({ to: "/inicio" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    }
  };

  const handleSignin = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      signinSchema.parse(signinData);
      
      const result = await login(signinData.email, signinData.senha);
      
      if (result.success) {
        navigate({ to: "/inicio" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          toast.error(err.message);
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950 to-amber-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Info */}
          <div className="text-white space-y-6">
            <div className="flex items-center gap-3">
              <img src={bookTeamLogo} alt="Book Team" className="w-12 h-12" />
              <h1 className="text-3xl font-bold">Book Team</h1>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight">
              Área do aluno
            </h2>
            
            <p className="text-lg text-amber-100">
              Acompanhe suas trilhas, encontros, pagamentos e certificados do
              Book Team Amor & Honra.
            </p>

            {mode === "signin" ? (
              <div>
                <p className="text-amber-100 mb-4">
                  Não tem conta ainda?{" "}
                  <Link
                    to="/auth"
                    search={{ mode: "signup" }}
                    className="text-amber-300 font-semibold hover:underline"
                  >
                    Criar conta
                  </Link>
                </p>
              </div>
            ) : (
              <div>
                <p className="text-amber-100 mb-4">
                  Já tem conta?{" "}
                  <Link
                    to="/auth"
                    search={{ mode: "signin" }}
                    className="text-amber-300 font-semibold hover:underline"
                  >
                    Entrar
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Right Side - Forms */}
          <div className="bg-white rounded-lg shadow-xl p-8">
            {mode === "signin" ? (
              <SigninForm
                data={signinData}
                setData={setSigninData}
                onSubmit={handleSignin}
                loading={loading}
              />
            ) : (
              <SignupForm
                data={signupData}
                setData={setSignupData}
                onSubmit={handleSignup}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SigninForm({ data, setData, onSubmit, loading }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Entrar ou criar conta</h2>
      </div>

      <div>
        <Label htmlFor="email" className="text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className="mt-2"
          disabled={loading}
          required
        />
      </div>

      <div>
        <Label htmlFor="senha" className="text-gray-700">
          Senha
        </Label>
        <Input
          id="senha"
          type="password"
          placeholder="••••••••"
          value={data.senha}
          onChange={(e) => setData({ ...data, senha: e.target.value })}
          className="mt-2"
          disabled={loading}
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}

function SignupForm({ data, setData, onSubmit, loading }: any) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar conta</h2>
      </div>

      <div>
        <Label htmlFor="nome" className="text-gray-700 text-sm">
          Nome completo
        </Label>
        <Input
          id="nome"
          placeholder="Seu nome"
          value={data.nome}
          onChange={(e) => setData({ ...data, nome: e.target.value })}
          className="mt-1 text-sm"
          disabled={loading}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cpf" className="text-gray-700 text-sm">
            CPF
          </Label>
          <Input
            id="cpf"
            placeholder="000.000.000-00"
            value={data.cpf}
            onChange={(e) => setData({ ...data, cpf: e.target.value })}
            className="mt-1 text-sm"
            disabled={loading}
            required
          />
        </div>
        <div>
          <Label htmlFor="telefone" className="text-gray-700 text-sm">
            Telefone
          </Label>
          <Input
            id="telefone"
            placeholder="(00) 00000-0000"
            value={data.telefone}
            onChange={(e) => setData({ ...data, telefone: e.target.value })}
            className="mt-1 text-sm"
            disabled={loading}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-gray-700 text-sm">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          className="mt-1 text-sm"
          disabled={loading}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cidade" className="text-gray-700 text-sm">
            Cidade
          </Label>
          <Input
            id="cidade"
            placeholder="Sua cidade"
            value={data.cidade}
            onChange={(e) => setData({ ...data, cidade: e.target.value })}
            className="mt-1 text-sm"
            disabled={loading}
            required
          />
        </div>
        <div>
          <Label htmlFor="estado" className="text-gray-700 text-sm">
            Estado
          </Label>
          <Input
            id="estado"
            placeholder="SP"
            value={data.estado}
            onChange={(e) => setData({ ...data, estado: e.target.value })}
            className="mt-1 text-sm"
            disabled={loading}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="senha" className="text-gray-700 text-sm">
          Senha
        </Label>
        <Input
          id="senha"
          type="password"
          placeholder="••••••••"
          value={data.senha}
          onChange={(e) => setData({ ...data, senha: e.target.value })}
          className="mt-1 text-sm"
          disabled={loading}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="lgpd"
          checked={data.lgpd}
          onCheckedChange={(checked) => setData({ ...data, lgpd: checked })}
          disabled={loading}
        />
        <Label htmlFor="lgpd" className="text-xs text-gray-600 cursor-pointer">
          Li e aceito os termos de uso e a política de privacidade (LGPD).
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg mt-4"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar minha conta"
        )}
      </Button>
    </form>
  );
}
