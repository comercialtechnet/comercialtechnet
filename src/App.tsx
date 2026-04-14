import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FiltersProvider } from "@/lib/filters-context";
import { supabaseExternal as supabase } from "@/integrations/supabase/external-client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { LoadingScreen } from "./components/LoadingScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FiltersProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </HashRouter>
      </FiltersProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
