import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { UserCheck, UserX, Shield, Key, Target, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useFilters } from '@/lib/filters-context';
import { formatMonthKey, generateMonthKey } from '@/lib/monthly-goals';
import { saveMetasToDatabase, deleteMetaFromDatabase } from '@/lib/db-service';
import { MonthlyGoal } from '@/lib/types';

interface MockUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  ativo: boolean;
  criado_em: string;
}

const initialUsers: MockUser[] = [
  { id: '1', nome: 'Admin Principal', email: 'admin@nexus.com', perfil: 'administrador', status: 'aprovado', ativo: true, criado_em: '2025-01-01' },
  { id: '2', nome: 'Ana Silva', email: 'ana@email.com', perfil: 'vendedor', status: 'aprovado', ativo: true, criado_em: '2025-01-15' },
  { id: '3', nome: 'Carlos Mendes', email: 'carlos@email.com', perfil: 'supervisor', status: 'aprovado', ativo: true, criado_em: '2025-01-10' },
  { id: '4', nome: 'Mariana Rocha', email: 'mariana@email.com', perfil: 'vendedor', status: 'pendente', ativo: false, criado_em: '2025-03-15' },
  { id: '5', nome: 'Pedro Alves', email: 'pedro@email.com', perfil: 'consultor', status: 'pendente', ativo: false, criado_em: '2025-03-17' },
];

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabAdmin() {
  const [users, setUsers] = useState(initialUsers);
  const [resetDialog, setResetDialog] = useState<string | null>(null);
  const { monthlyGoals, setMonthlyGoals } = useFilters();

  // Goals editing state
  const [editingGoals, setEditingGoals] = useState<Record<string, MonthlyGoal>>({});
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [newMonthYear, setNewMonthYear] = useState('');

  const startEditingGoals = () => {
    setEditingGoals({ ...monthlyGoals });
    setIsEditingGoals(true);
  };

  const saveGoals = async () => {
    setMonthlyGoals(editingGoals);
    setIsEditingGoals(false);
    try {
      await saveMetasToDatabase(editingGoals);
      toast.success('Metas salvas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar metas no banco. Salvo localmente.');
    }
  };

  const cancelEditGoals = () => {
    setEditingGoals({});
    setIsEditingGoals(false);
  };

  const updateGoalField = (key: string, field: keyof MonthlyGoal, value: string) => {
    const numVal = parseFloat(value) || 0;
    setEditingGoals(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: numVal },
    }));
  };

  const removeGoalMonth = (key: string) => {
    setEditingGoals(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    deleteMetaFromDatabase(key).catch(console.error);
  };

  const addGoalMonth = () => {
    if (!newMonthYear) return;
    const [year, month] = newMonthYear.split('-');
    const key = generateMonthKey(parseInt(year), parseInt(month));
    if (editingGoals[key]) {
      toast.error('Este mês já existe nas metas.');
      return;
    }
    setEditingGoals(prev => ({
      ...prev,
      [key]: { meta_faturamento: 100000, meta_total_vendas: 200, meta_vendas_virtua: 120 },
    }));
    setNewMonthYear('');
  };

  const approve = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'aprovado', ativo: true } : u));
    toast.success('Usuário aprovado com sucesso!');
  };

  const reject = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: 'rejeitado' } : u));
    toast.success('Solicitação rejeitada.');
  };

  const toggleActive = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  };

  const pending = users.filter(u => u.status === 'pendente');
  const approved = users.filter(u => u.status === 'aprovado');

  const sortedGoalKeys = Object.keys(isEditingGoals ? editingGoals : monthlyGoals).sort();
  const displayGoals = isEditingGoals ? editingGoals : monthlyGoals;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Administração</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Gerenciar usuários, metas e classificações</p>
      </div>

      {/* Monthly Goals Section */}
      <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Metas Mensais
          </h3>
          {!isEditingGoals ? (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={startEditingGoals}>
              Editar Metas
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditGoals}>Cancelar</Button>
              <Button size="sm" className="h-7 text-xs gap-1" onClick={saveGoals}>
                <Save className="h-3 w-3" /> Salvar
              </Button>
            </div>
          )}
        </div>

        {/* Add new month (editing mode) */}
        {isEditingGoals && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-surface rounded-lg">
            <Input
              type="month"
              className="h-7 text-xs w-40"
              value={newMonthYear}
              onChange={e => setNewMonthYear(e.target.value)}
            />
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addGoalMonth} disabled={!newMonthYear}>
              <Plus className="h-3 w-3" /> Adicionar Mês
            </Button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Meta Faturamento</th>
                <th>Meta Total Vendas</th>
                <th>Meta Vendas Internet</th>
                {isEditingGoals && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {sortedGoalKeys.map(key => {
                const goal = displayGoals[key];
                return (
                  <tr key={key}>
                    <td className="text-xs font-medium">{formatMonthKey(key)}</td>
                    {isEditingGoals ? (
                      <>
                        <td>
                          <Input
                            type="number"
                            className="h-7 text-xs w-32"
                            value={goal.meta_faturamento}
                            onChange={e => updateGoalField(key, 'meta_faturamento', e.target.value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            className="h-7 text-xs w-24"
                            value={goal.meta_total_vendas}
                            onChange={e => updateGoalField(key, 'meta_total_vendas', e.target.value)}
                          />
                        </td>
                        <td>
                          <Input
                            type="number"
                            className="h-7 text-xs w-24"
                            value={goal.meta_vendas_virtua}
                            onChange={e => updateGoalField(key, 'meta_vendas_virtua', e.target.value)}
                          />
                        </td>
                        <td>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeGoalMonth(key)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-xs tabular-nums">{fmt(goal.meta_faturamento)}</td>
                        <td className="text-xs tabular-nums">{goal.meta_total_vendas}</td>
                        <td className="text-xs tabular-nums">{goal.meta_vendas_virtua}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {sortedGoalKeys.length === 0 && (
                <tr>
                  <td colSpan={isEditingGoals ? 5 : 4} className="text-center text-xs text-muted-foreground py-8">
                    Nenhuma meta configurada. Clique em "Editar Metas" para adicionar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="space-y-2 md:hidden">
          {sortedGoalKeys.map(key => {
            const goal = displayGoals[key];
            return (
              <div key={key} className="bg-surface rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">{formatMonthKey(key)}</span>
                  {isEditingGoals && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeGoalMonth(key)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {isEditingGoals ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Faturamento</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_faturamento} onChange={e => updateGoalField(key, 'meta_faturamento', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Total Vendas</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_total_vendas} onChange={e => updateGoalField(key, 'meta_total_vendas', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Vendas Internet</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_vendas_virtua} onChange={e => updateGoalField(key, 'meta_vendas_virtua', e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Faturamento</p>
                      <p className="text-xs font-semibold tabular-nums">{fmt(goal.meta_faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Vendas</p>
                      <p className="text-xs font-semibold tabular-nums">{goal.meta_total_vendas}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Internet</p>
                      <p className="text-xs font-semibold tabular-nums">{goal.meta_vendas_virtua}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sortedGoalKeys.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">Nenhuma meta configurada.</p>
          )}
        </div>
      </div>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Solicitações Pendentes ({pending.length})
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {pending.map(u => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.nome}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{u.email} · {u.perfil} · {u.criado_em}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 sm:flex-none" onClick={() => approve(u.id)}>
                    <UserCheck className="h-3 w-3" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1 sm:flex-none text-destructive" onClick={() => reject(u.id)}>
                    <UserX className="h-3 w-3" /> Rejeitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active users */}
      <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4">Usuários Ativos</h3>

        <div className="space-y-2 md:hidden">
          {approved.map(u => (
            <div key={u.id} className="bg-surface rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{u.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
                <span className="status-badge status-approved text-[10px]">{u.perfil}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(u.id)} className={`h-5 w-9 rounded-full transition-colors ${u.ativo ? 'bg-success' : 'bg-muted'} relative`}>
                    <span className={`block h-3.5 w-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${u.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-[10px] text-muted-foreground">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setResetDialog(u.id)}>
                  <Key className="h-3 w-3" /> Senha
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {approved.map(u => (
                <tr key={u.id}>
                  <td className="text-sm font-medium">{u.nome}</td>
                  <td className="text-xs">{u.email}</td>
                  <td><span className="status-badge status-approved">{u.perfil}</span></td>
                  <td><span className={`status-badge ${u.status === 'aprovado' ? 'status-approved' : 'status-pending'}`}>{u.status}</span></td>
                  <td>
                    <button onClick={() => toggleActive(u.id)} className={`h-5 w-9 rounded-full transition-colors ${u.ativo ? 'bg-success' : 'bg-muted'} relative`}>
                      <span className={`block h-3.5 w-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${u.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setResetDialog(u.id)}>
                      <Key className="h-3 w-3" /> Senha
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset password dialog */}
      <Dialog open={!!resetDialog} onOpenChange={() => setResetDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Redefinir Senha</DialogTitle>
            <DialogDescription>A nova senha será definida para o usuário selecionado.</DialogDescription>
          </DialogHeader>
          <Input type="password" placeholder="Nova senha" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>Cancelar</Button>
            <Button onClick={() => { setResetDialog(null); toast.success('Senha redefinida!'); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
