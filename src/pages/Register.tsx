import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabaseExternal } from '@/integrations/supabase/external-client';

export default function Register() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState<string>('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!perfil || !nome) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseExternal.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome_vinculado: nome,
            perfil: perfil,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Sign out immediately so the pending user doesn't stay logged in
      await supabaseExternal.auth.signOut();
      setSubmitted(true);
    } catch (err: any) {
      toast.error('Erro ao criar conta. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="bg-card rounded-xl border border-border shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Solicitação enviada!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Sua conta foi criada. Verifique seu email para confirmar e aguarde a aprovação do administrador para acessar o sistema.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>Voltar ao login</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
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

          <h2 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Solicitar Cadastro</h2>
          <p className="text-sm text-muted-foreground mb-6">Preencha seus dados para solicitar acesso</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Perfil</Label>
              <Select value={perfil} onValueChange={setPerfil}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="consultor">Consultor</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Nome</Label>
              <Input type="text" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Senha</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar cadastro'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/')} className="text-sm text-primary hover:underline">
              Já tenho acesso — Entrar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
