import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

export default function Login() {
  const navigate = useNavigate();
  const { dark, toggle: toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    // Verificar status de aprovação
    try {
      const userId = data.session?.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('status_aprovacao, ativo')
          .eq('id', userId)
          .single();

        if (!profile || profile.status_aprovacao === 'pendente') {
          await supabase.auth.signOut();
          setLoading(false);
          toast.error('Sua conta ainda não foi aprovada. Entre em contato com um administrador para autorizar seu acesso.');
          return;
        }

        if (profile.status_aprovacao === 'rejeitado') {
          await supabase.auth.signOut();
          setLoading(false);
          toast.error('Sua solicitação de cadastro foi rejeitada. Entre em contato com um administrador.');
          return;
        }

        if (!profile.ativo) {
          await supabase.auth.signOut();
          setLoading(false);
          toast.error('Sua conta está desativada. Entre em contato com um administrador.');
          return;
        }
      }
    } catch (err) {
      console.warn('Erro ao verificar aprovação:', err);
    }

    setLoading(false);
    toast.success('Login realizado com sucesso!');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4 h-9 w-9 text-muted-foreground hover:text-foreground"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card rounded-xl border border-border shadow-lg p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">TechNET</h1>
              <p className="text-xs text-muted-foreground">Comercial</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Entrar</h2>
          <p className="text-sm text-muted-foreground mb-6">Acesse o painel de gestão comercial</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <button onClick={() => navigate('/register')} className="text-sm text-primary hover:underline">
              Solicitar cadastro
            </button>
            <p className="text-xs text-muted-foreground">
              Esqueceu a senha? Solicite ao administrador.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          TechNET - Comercial © 2025
        </p>
      </motion.div>
    </div>
  );
}
