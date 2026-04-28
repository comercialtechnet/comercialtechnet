import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Component, ErrorInfo, ReactNode, useEffect, useState, lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FiltersProvider } from "@/lib/filters-context";
import { supabaseExternal as supabase } from "@/integrations/supabase/external-client";
import { LoadingScreen } from "./components/LoadingScreen";

// Code-splitting por rota — só baixa o JS da tela que o usuário realmente abre.
// O Login (rota inicial) é o único que precisa estar pronto rapidamente, mas
// ainda assim lazy para não arrastar dependências de outras telas.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Tela protegida contra tela branca]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg space-y-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Não foi possível abrir esta tela</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Recarregue os dados para restaurar o painel sem ficar em tela branca.
            </p>
          </div>
          {this.state.message && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={() => window.location.reload()}>
              Recarregar tela
            </button>
            <button className="h-9 rounded-md border border-border px-4 text-sm font-medium text-foreground" onClick={() => { window.location.hash = '/'; window.location.reload(); }}>
              Voltar ao login
            </button>
          </div>
        </div>
      </div>
    );
  }
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!session?.user) {
        setIsAuthenticated(false);
        setIsReady(true);
        return;
      }

      // Verificar se o usuário está aprovado
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status_aprovacao, ativo')
          .eq('id', session.user.id)
          .single();

        if (!profile || profile.status_aprovacao !== 'aprovado' || !profile.ativo) {
          await supabase.auth.signOut();
          if (mounted) {
            setIsAuthenticated(false);
            setIsReady(true);
          }
          return;
        }
      } catch {
        // Se falhar a verificação, permitir acesso (fallback)
      }

      setIsAuthenticated(true);
      setIsReady(true);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (_event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

const App: React.FC = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <FiltersProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </FiltersProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
