import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, UserX, Shield, Key, Target, Plus, Trash2, Save, Loader2, ShieldCheck, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFilters } from '@/lib/filters-context';
import {
  formatMonthKey,
  generateGoalKey,
  parseGoalKey,
  EMPRESAS,
  DEFAULT_META_FATURAMENTO,
  DEFAULT_META_VIRTUA,
  type Empresa,
} from '@/lib/monthly-goals';
import { saveMetasToDatabase, deleteMetaFromDatabase } from '@/lib/db-service';
import { MonthlyGoal } from '@/lib/types';
import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';
import { Database } from '@/integrations/supabase/types';
import { NumericFormat } from "react-number-format";
import { MultiSelectFilter } from './MultiSelectFilter';
import { parseBindings, joinBindings } from '@/lib/utils';


interface ProfileUser {
  id: string;
  nome_vinculado: string;
  nome_normalizado: string;
  perfil: string;
  status_aprovacao: string;
  ativo: boolean;
  email?: string;
  nome_supervisor_vinculado: string | null;
  nome_vendedor_vinculado: string | null;
}
type AppRole = Database['public']['Enums']['app_role'];
type ProfileWithBindings = {
  id: string;
  nome_vinculado: string;
  nome_normalizado: string;
  perfil: AppRole;
  status_aprovacao: string;
  ativo: boolean;
  nome_supervisor_vinculado?: string | null;
  nome_vendedor_vinculado?: string | null;
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PERFIL_OPTIONS = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'consultor', label: 'Consultor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'administrador', label: 'Administrador' },
];

export function TabAdmin() {
  const { userInfo: _u } = useFilters();
  if (_u && _u.perfil !== 'administrador') {
    return (
      <div className="bg-card rounded-lg border border-border p-6 sm:p-8 text-center">
        <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-2">Acesso restrito</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Esta área é exclusiva para administradores.
        </p>
      </div>
    );
  }
  return <TabAdminInner />;
}

function TabAdminInner() {
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [resetDialog, setResetDialog] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const { monthlyGoals, setMonthlyGoals, importedData, userInfo } = useFilters();

  const [editingGoals, setEditingGoals] = useState<Record<string, MonthlyGoal>>({});
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const currentMonthInput = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const [newGoalMonth, setNewGoalMonth] = useState<string>(currentMonthInput);
  const [newGoalEmpresa, setNewGoalEmpresa] = useState<Empresa>('RDT');
  const [newGoalFat, setNewGoalFat] = useState<number | undefined>(DEFAULT_META_FATURAMENTO);
  const [newGoalFatSup, setNewGoalFatSup] = useState<number | undefined>(undefined);
  const [newGoalVirtua, setNewGoalVirtua] = useState<number | undefined>(DEFAULT_META_VIRTUA);
  const [newGoalVirtuaSup, setNewGoalVirtuaSup] = useState<number | undefined>(undefined);
  // Track manual edits so auto-derived per-supervisor values don't overwrite the user's input
  const fatSupTouchedRef = useState({ current: false })[0];
  const virtuaSupTouchedRef = useState({ current: false })[0];

  // Lista de nomes de supervisores que existem na base de vendas
  const supervisorNamesFromData = useMemo(() => {
    if (!importedData?.vendas) return [];
    const set = new Set(importedData.vendas.map(v => v.supervisor).filter(Boolean));
    return Array.from(set).sort();
  }, [importedData]);

  // Quantidade de supervisores ativos no MÊS ANTERIOR ao mês selecionado, por empresa.
  // Serve como base para pré-preencher metas por supervisor: assume-se que a equipe
  // do mês anterior é uma boa estimativa do tamanho atual da equipe.
  const previousMonthInfo = useMemo(() => {
    if (!newGoalMonth) return { ym: '', counts: { RDT: 0, VNA: 0 } as Record<Empresa, number> };
    const [y, m] = newGoalMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1); // m é 1-based; -2 vai para o mês anterior
    const prevY = prev.getFullYear();
    const prevM = prev.getMonth() + 1;
    const ym = `${prevY}-${String(prevM).padStart(2, '0')}`;
    const counts: Record<Empresa, number> = { RDT: 0, VNA: 0 };
    const setRDT = new Set<string>();
    const setVNA = new Set<string>();
    for (const v of importedData?.vendas || []) {
      if (!v.supervisor || !v.data_instalacao) continue;
      if (!v.data_instalacao.startsWith(ym)) continue;
      const empresa = (v.empresa_venda || '').toUpperCase();
      if (empresa.includes('VNA')) setVNA.add(v.supervisor);
      else setRDT.add(v.supervisor);
    }
    counts.RDT = setRDT.size;
    counts.VNA = setVNA.size;
    return { ym, counts };
  }, [importedData, newGoalMonth]);
  const supervisorCountByEmpresa = previousMonthInfo.counts;

  // Recalcula metas/supervisor automaticamente enquanto o usuário não tiver editado manualmente
  useEffect(() => {
    const n = supervisorCountByEmpresa[newGoalEmpresa] || 1;
    if (!fatSupTouchedRef.current) {
      const total = newGoalFat ?? 0;
      setNewGoalFatSup(n > 0 ? Math.round((total / n) * 100) / 100 : 0);
    }
    if (!virtuaSupTouchedRef.current) {
      const total = newGoalVirtua ?? 0;
      setNewGoalVirtuaSup(n > 0 ? Math.ceil(total / n) : 0);
    }
  }, [newGoalFat, newGoalVirtua, newGoalEmpresa, supervisorCountByEmpresa, fatSupTouchedRef, virtuaSupTouchedRef]);

  // Lista de nomes de vendedores que existem na base de vendas
  const vendedorNamesFromData = useMemo(() => {
    if (!importedData?.vendas) return [];
    const set = new Set(importedData.vendas.map(v => v.vendedor).filter(Boolean));
    return Array.from(set).sort();
  }, [importedData]);

  // Cargo editável na tela de aprovação pendente
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Erro ao carregar perfis:', error);
        toast.error('Erro ao carregar usuários.');
        return;
      }

      const mapped: ProfileUser[] = ((profiles || []) as ProfileWithBindings[]).map((p) => ({
        id: p.id,
        nome_vinculado: p.nome_vinculado,
        nome_normalizado: p.nome_normalizado,
        perfil: p.perfil,
        status_aprovacao: p.status_aprovacao,
        ativo: p.ativo,
        nome_supervisor_vinculado: p.nome_supervisor_vinculado || null,
        nome_vendedor_vinculado: p.nome_vendedor_vinculado || null,
      }));

      setUsers(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
      toast.error('Erro ao salvar metas no banco.');
    }
  };

  const cancelEditGoals = () => {
    setEditingGoals({});
    setIsEditingGoals(false);
  };

  const updateGoalField = (key: string, field: keyof MonthlyGoal, value: string) => {
    if (field === 'empresa') return; // empresa é definida na criação
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

  const handleAddGoal = async () => {
    if (!newGoalMonth) return;
    const [year, month] = newGoalMonth.split('-');
    const key = generateGoalKey(parseInt(year), parseInt(month), newGoalEmpresa);

    if (monthlyGoals[key]) {
      toast.error(`Já existe meta de ${newGoalEmpresa} para este mês.`);
      return;
    }

    const newGoal: MonthlyGoal = {
      empresa: newGoalEmpresa,
      meta_faturamento: newGoalFat || 0,
      meta_faturamento_supervisor: newGoalFatSup || 0,
      meta_vendas_virtua: newGoalVirtua || 0,
      meta_vendas_virtua_supervisor: newGoalVirtuaSup || 0,
    };

    const updated = { ...monthlyGoals, [key]: newGoal };
    setMonthlyGoals(updated);

    try {
      await saveMetasToDatabase({ [key]: newGoal });
      toast.success(`Meta de ${formatMonthKey(key)} adicionada!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar meta.');
    }

    setAddGoalOpen(false);
    // Reset para próximo cadastro
    setNewGoalMonth(currentMonthInput);
    setNewGoalEmpresa('RDT');
    setNewGoalFat(DEFAULT_META_FATURAMENTO);
    setNewGoalVirtua(DEFAULT_META_VIRTUA);
    fatSupTouchedRef.current = false;
    virtuaSupTouchedRef.current = false;
  };

  const approveUser = async (id: string) => {
    // Usar o cargo que o admin pode ter alterado, ou o original
    const finalRole = (pendingRoles[id] || users.find(u => u.id === id)?.perfil || 'vendedor') as AppRole;

    const { error } = await supabase
      .from('profiles')
      .update({
        status_aprovacao: 'aprovado' as const,
        ativo: true,
        perfil: finalRole,
        aprovado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao aprovar: ' + error.message);
      return;
    }

    await supabase.from('user_roles').delete().eq('user_id', id);
    await supabase.from('user_roles').insert({ user_id: id, role: finalRole });

    // Limpar pendingRoles para esse user
    setPendingRoles(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    toast.success('Usuário aprovado com sucesso!');
    loadUsers();
  };

  const rejectUser = async (id: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status_aprovacao: 'rejeitado' as const })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao rejeitar: ' + error.message);
      return;
    }
    toast.success('Solicitação rejeitada.');
    loadUsers();
  };

  const toggleActive = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ativo: !user.ativo })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao alterar status: ' + error.message);
      return;
    }
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ativo: !u.ativo } : u));
  };

  const changeRole = async (userId: string, newRole: AppRole) => {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ perfil: newRole })
      .eq('id', userId);

    if (profileError) {
      toast.error('Erro ao alterar perfil: ' + profileError.message);
      return;
    }

    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_roles').insert({ user_id: userId, role: newRole });

    // Limpar vínculos que não se aplicam ao novo perfil
    const updates: { nome_supervisor_vinculado?: null; nome_vendedor_vinculado?: null } = {};
    if (newRole !== 'supervisor') {
      updates.nome_supervisor_vinculado = null;
    }
    if (newRole !== 'vendedor' && newRole !== 'consultor') {
      updates.nome_vendedor_vinculado = null;
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
    }

    setUsers(prev => prev.map(u => u.id === userId ? {
      ...u,
      perfil: newRole,
      nome_supervisor_vinculado: newRole === 'supervisor' ? u.nome_supervisor_vinculado : null,
      nome_vendedor_vinculado: (newRole === 'vendedor' || newRole === 'consultor') ? u.nome_vendedor_vinculado : null,
    } : u));

    toast.success('Perfil alterado com sucesso!');
  };

  const linkSupervisores = async (userId: string, supervisorNames: string[]) => {
    const value = joinBindings(supervisorNames);

    const { error } = await supabase
      .from('profiles')
      .update({ nome_supervisor_vinculado: value })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao vincular supervisor: ' + error.message);
      return;
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, nome_supervisor_vinculado: value } : u));
    toast.success(value ? `Vinculado a ${supervisorNames.length} supervisor(es)` : 'Vínculo removido');
  };

  const linkVendedor = async (userId: string, vendedorName: string | null) => {
    const value = vendedorName === '__none__' ? null : vendedorName;

    const { error } = await supabase
      .from('profiles')
      .update({ nome_vendedor_vinculado: value })
      .eq('id', userId);

    if (error) {
      toast.error('Erro ao vincular vendedor: ' + error.message);
      return;
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, nome_vendedor_vinculado: value } : u));
    toast.success(value ? `Vinculado ao vendedor "${value}"` : 'Vínculo removido');
  };

  const pending = users.filter(u => u.status_aprovacao === 'pendente');
  const approved = users.filter(u => u.status_aprovacao === 'aprovado');
  const rejected = users.filter(u => u.status_aprovacao === 'rejeitado');

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
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddGoalOpen(true)}>
              <Plus className="h-3 w-3" /> Adicionar Meta
            </Button>
            {!isEditingGoals ? (
              sortedGoalKeys.length > 0 && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={startEditingGoals}>
                  Editar Metas
                </Button>
              )
            ) : (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={cancelEditGoals}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs gap-1" onClick={saveGoals}>
                  <Save className="h-3 w-3" /> Salvar
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Empresa</th>
                <th>Faturamento</th>
                <th>Fat./Supervisor</th>
                <th>Qtd. Virtua</th>
                <th>Virtua/Supervisor</th>
                {isEditingGoals && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {sortedGoalKeys.map(key => {
                const goal = displayGoals[key];
                const parsed = parseGoalKey(key);
                return (
                  <tr key={key}>
                    <td className="text-xs font-medium">{parsed ? `${formatMonthKey(`${parsed.year}-${String(parsed.month).padStart(2,'0')}`)}` : key}</td>
                    <td className="text-xs font-semibold">{goal.empresa}</td>
                    {isEditingGoals ? (
                      <>
                        <td><Input type="number" className="h-7 text-xs w-32" value={goal.meta_faturamento} onChange={e => updateGoalField(key, 'meta_faturamento', e.target.value)} /></td>
                        <td><Input type="number" className="h-7 text-xs w-28" value={goal.meta_faturamento_supervisor} onChange={e => updateGoalField(key, 'meta_faturamento_supervisor', e.target.value)} /></td>
                        <td><Input type="number" className="h-7 text-xs w-24" value={goal.meta_vendas_virtua} onChange={e => updateGoalField(key, 'meta_vendas_virtua', e.target.value)} /></td>
                        <td><Input type="number" className="h-7 text-xs w-24" value={goal.meta_vendas_virtua_supervisor} onChange={e => updateGoalField(key, 'meta_vendas_virtua_supervisor', e.target.value)} /></td>
                        <td>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeGoalMonth(key)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-xs tabular-nums">{fmt(goal.meta_faturamento)}</td>
                        <td className="text-xs tabular-nums">{fmt(goal.meta_faturamento_supervisor)}</td>
                        <td className="text-xs tabular-nums">{goal.meta_vendas_virtua}</td>
                        <td className="text-xs tabular-nums">{goal.meta_vendas_virtua_supervisor}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {sortedGoalKeys.length === 0 && (
                <tr>
                  <td colSpan={isEditingGoals ? 7 : 6} className="text-center text-xs text-muted-foreground py-8">
                    Nenhuma meta configurada. Clique em "Adicionar Meta" para começar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 md:hidden">
          {sortedGoalKeys.map(key => {
            const goal = displayGoals[key];
            const parsed = parseGoalKey(key);
            return (
              <div key={key} className="bg-surface rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {parsed ? `${formatMonthKey(`${parsed.year}-${String(parsed.month).padStart(2,'0')}`)} · ${goal.empresa}` : key}
                  </span>
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
                      <label className="text-[9px] text-muted-foreground uppercase">Fat./Supervisor</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_faturamento_supervisor} onChange={e => updateGoalField(key, 'meta_faturamento_supervisor', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Qtd. Virtua</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_vendas_virtua} onChange={e => updateGoalField(key, 'meta_vendas_virtua', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground uppercase">Virtua/Supervisor</label>
                      <Input type="number" className="h-7 text-xs" value={goal.meta_vendas_virtua_supervisor} onChange={e => updateGoalField(key, 'meta_vendas_virtua_supervisor', e.target.value)} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Faturamento</p>
                      <p className="text-xs font-semibold tabular-nums">{fmt(goal.meta_faturamento)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Fat./Supervisor</p>
                      <p className="text-xs font-semibold tabular-nums">{fmt(goal.meta_faturamento_supervisor)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Qtd. Virtua</p>
                      <p className="text-xs font-semibold tabular-nums">{goal.meta_vendas_virtua}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">Virtua/Sup.</p>
                      <p className="text-xs font-semibold tabular-nums">{goal.meta_vendas_virtua_supervisor}</p>
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

      {/* Add Goal Dialog */}
      <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Meta</DialogTitle>
            <DialogDescription>Preencha os dados da meta mensal por empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Mês/Ano</label>
                <Input type="month" className="mt-1" value={newGoalMonth} onChange={e => setNewGoalMonth(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Empresa</label>
                <Select value={newGoalEmpresa} onValueChange={(v) => setNewGoalEmpresa(v as Empresa)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPRESAS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Supervisores em {newGoalEmpresa} no mês anterior
              {previousMonthInfo.ym ? ` (${previousMonthInfo.ym})` : ''}: <span className="font-semibold">{supervisorCountByEmpresa[newGoalEmpresa] || 0}</span>
              {' '}— usado como base para os pré-preenchimentos por supervisor.
            </p>

            <div>
              <label className="text-xs text-muted-foreground">Meta de faturamento geral (R$)</label>
              <NumericFormat
                customInput={Input}
                className="mt-1"
                placeholder="Ex: R$ 60.000,00"
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                value={newGoalFat}
                onValueChange={(values) => setNewGoalFat(values.floatValue)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Meta de faturamento por supervisor (R$)
                <span className="ml-1 text-[10px]">· {supervisorCountByEmpresa[newGoalEmpresa] || 0} supervisor(es) no mês anterior</span>
              </label>
              <NumericFormat
                customInput={Input}
                className="mt-1"
                placeholder="Auto"
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                value={newGoalFatSup}
                onValueChange={(values) => {
                  fatSupTouchedRef.current = true;
                  setNewGoalFatSup(values.floatValue);
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Meta de quantidade de Virtua</label>
              <Input
                type="number"
                className="mt-1"
                placeholder="Ex: 300"
                value={newGoalVirtua ?? ''}
                onChange={e => setNewGoalVirtua(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Meta de quantidade de Virtua por supervisor
                <span className="ml-1 text-[10px]">· {supervisorCountByEmpresa[newGoalEmpresa] || 0} supervisor(es) no mês anterior</span>
              </label>
              <Input
                type="number"
                className="mt-1"
                placeholder="Auto"
                value={newGoalVirtuaSup ?? ''}
                onChange={e => {
                  virtuaSupTouchedRef.current = true;
                  setNewGoalVirtuaSup(e.target.value === '' ? undefined : parseInt(e.target.value, 10));
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGoalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddGoal} disabled={!newGoalMonth}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loadingUsers ? (
        <div className="bg-card rounded-lg border border-border p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Carregando usuários...</span>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bg-card rounded-lg border border-amber-200 dark:border-amber-800 p-3 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                Aguardando Aprovação ({pending.length})
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {pending.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.nome_vinculado}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Solicitou: <span className="font-medium">{u.perfil}</span></p>
                      <div className="mt-1.5">
                        <label className="text-[9px] text-muted-foreground uppercase block mb-0.5">Cargo para aprovação</label>
                        <Select value={pendingRoles[u.id] || u.perfil} onValueChange={v => setPendingRoles(prev => ({ ...prev, [u.id]: v }))}>
                          <SelectTrigger className="h-7 text-xs w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERFIL_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 flex-1 sm:flex-none" onClick={() => approveUser(u.id)}>
                        <UserCheck className="h-3 w-3" /> Aprovar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 flex-1 sm:flex-none text-destructive" onClick={() => rejectUser(u.id)}>
                        <UserX className="h-3 w-3" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All users */}
          <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Todos os Usuários ({users.length})
            </h3>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {users.map(u => (
                <div key={u.id} className="bg-surface rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.nome_vinculado}</p>
                      <p className="text-[10px] text-muted-foreground">{u.nome_normalizado}</p>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${u.status_aprovacao === 'aprovado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      u.status_aprovacao === 'pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{u.status_aprovacao}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Select value={u.perfil} onValueChange={v => changeRole(u.id, v as AppRole)}>
                      <SelectTrigger className="h-7 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERFIL_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(u.id)} className={`h-5 w-9 rounded-full transition-colors ${u.ativo ? 'bg-green-500' : 'bg-muted'} relative`}>
                        <span className={`block h-3.5 w-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${u.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="text-[10px] text-muted-foreground">{u.ativo ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                  {/* Vinculação de supervisor (mobile) */}
                  {u.perfil === 'supervisor' && (
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <MultiSelectFilter
                          label="Supervisor(es)"
                          options={supervisorNamesFromData}
                          selected={parseBindings(u.nome_supervisor_vinculado)}
                          onChange={(sel) => linkSupervisores(u.id, sel)}
                          triggerClassName="h-7 sm:h-7"
                        />
                      </div>
                    </div>
                  )}
                  {/* Vinculação de vendedor (mobile) */}
                  {(u.perfil === 'vendedor' || u.perfil === 'consultor') && (
                    <div className="flex items-center gap-1.5">
                      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Select
                        value={u.nome_vendedor_vinculado || '__none__'}
                        onValueChange={v => linkVendedor(u.id, v)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue placeholder="Vincular vendedor..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem vínculo</SelectItem>
                          {vendedorNamesFromData.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-6">Nenhum usuário encontrado.</p>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Perfil</th>
                    <th>Vínculo</th>
                    <th>Status</th>
                    <th>Ativo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div>
                          <p className="text-sm font-medium">{u.nome_vinculado}</p>
                          <p className="text-[10px] text-muted-foreground">{u.nome_normalizado}</p>
                        </div>
                      </td>
                      <td>
                        <Select value={u.perfil} onValueChange={v => changeRole(u.id, v as AppRole)}>
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERFIL_OPTIONS.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        {u.perfil === 'supervisor' ? (
                          <div className="w-44">
                            <MultiSelectFilter
                              label="Supervisor(es)"
                              options={supervisorNamesFromData}
                              selected={parseBindings(u.nome_supervisor_vinculado)}
                              onChange={(sel) => linkSupervisores(u.id, sel)}
                              triggerClassName="h-7 sm:h-7"
                            />
                          </div>
                        ) : (u.perfil === 'vendedor' || u.perfil === 'consultor') ? (
                          <Select
                            value={u.nome_vendedor_vinculado || '__none__'}
                            onValueChange={v => linkVendedor(u.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-44">
                              <SelectValue placeholder="Vincular..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Sem vínculo</SelectItem>
                              {vendedorNamesFromData.map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${u.status_aprovacao === 'aprovado' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          u.status_aprovacao === 'pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>{u.status_aprovacao}</span>
                      </td>
                      <td>
                        <button onClick={() => toggleActive(u.id)} className={`h-5 w-9 rounded-full transition-colors ${u.ativo ? 'bg-green-500' : 'bg-muted'} relative`}>
                          <span className={`block h-3.5 w-3.5 rounded-full bg-card absolute top-0.5 transition-transform ${u.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {u.status_aprovacao === 'pendente' && (
                            <>
                              <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => approveUser(u.id)}>
                                <UserCheck className="h-3 w-3" /> Aprovar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-destructive" onClick={() => rejectUser(u.id)}>
                                <UserX className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setResetDialog(u.id); setNewPassword(''); }}>
                            <Key className="h-3 w-3" /> Senha
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Reset password dialog */}
      <Dialog open={!!resetDialog} onOpenChange={() => setResetDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Redefinir Senha</DialogTitle>
            <DialogDescription>A nova senha será definida para o usuário selecionado.</DialogDescription>
          </DialogHeader>
          <Input type="password" placeholder="Nova senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialog(null)}>Cancelar</Button>
            <Button onClick={() => { setResetDialog(null); toast.info('Funcionalidade de reset de senha requer configuração de Edge Function.'); }}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
