import { useState } from 'react';
import { useFilteredData, calcVariation } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { Users, AlertTriangle, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Trophy, Wifi, Package, DollarSign, Target, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { chartTooltip, titleCase } from '@/lib/chart-tooltip';
import { parseBindings } from '@/lib/utils';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 6;

function VariationBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const variation = calcVariation(current, previous);
  if (variation === undefined) return <span className="text-[9px] text-muted-foreground">N/A</span>;
  const isPositive = variation > 0;
  const isZero = variation === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums ${isZero ? 'text-muted-foreground' : isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
      {isZero ? <Minus className="h-2.5 w-2.5" /> : isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {isPositive ? '+' : ''}{variation.toFixed(1)}%
    </span>
  );
}

export function TabSupervisao() {
  const { stats, compStats, hasComparison, filteredVendas, filteredItens } = useFilteredData();
  const { userInfo } = useFilters();
  const [page, setPage] = useState(0);

  const isAdmin = userInfo?.perfil === 'administrador';
  const isSupervisor = userInfo?.perfil === 'supervisor';
  const supervisorVinculado = userInfo?.nome_supervisor_vinculado || null;
  const supervisoresVinculados = parseBindings(supervisorVinculado);

  // Se é supervisor mas não tem vínculo, mostrar mensagem
  if (isSupervisor && !supervisorVinculado) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Supervisão</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Visão por equipe e supervisor</p>
        </div>
        <div className="bg-card rounded-lg border border-amber-200 dark:border-amber-800 p-6 sm:p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-2">Aguardando vinculação</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Seu perfil de supervisor ainda não foi vinculado a uma equipe na base de dados.
            Solicite ao administrador que faça a vinculação na aba Admin.
          </p>
        </div>
      </div>
    );
  }

  const allSupervisores = Object.entries(stats.porSupervisor)
    .map(([nome, data]) => {
      const vendedoresList = Array.from(data.vendedores)
        .map(v => {
          const vData = stats.porVendedor[v];
          return {
            nome: v,
            faturamento: vData?.faturamento ?? 0,
            vendas: vData?.vendas ?? 0,
            produtos: vData?.produtos ?? 0,
            vendasInternet: vData?.vendasInternet ?? 0,
          };
        })
        .sort((a, b) => b.faturamento - a.faturamento);

      const compData = compStats?.porSupervisor[nome];

      return {
        nome,
        faturamento: data.faturamento,
        vendas: data.vendas,
        produtos: data.produtos,
        vendasInternet: data.vendasInternet,
        vendedores: vendedoresList,
        compFaturamento: compData?.faturamento,
        compVendas: compData?.vendas,
        compProdutos: compData?.produtos,
        compVendasInternet: compData?.vendasInternet,
      };
    })
    .sort((a, b) => b.faturamento - a.faturamento);

  // Filtrar: se é supervisor com vínculo, mostrar apenas sua equipe
  const supervisores = isSupervisor && supervisoresVinculados.length
    ? allSupervisores.filter(s => supervisoresVinculados.includes(s.nome))
    : allSupervisores;

  // Paginação
  const totalPages = Math.ceil(supervisores.length / PAGE_SIZE);
  const pagedSupervisores = supervisores.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ============= Vista DETALHADA: apenas 1 supervisor =============
  if (supervisores.length === 1) {
    const sup = supervisores[0];
    const vendedoresSet = new Set(sup.vendedores.map(v => v.nome.toUpperCase()));
    const supVendas = filteredVendas.filter(v => vendedoresSet.has((v.vendedor || '').toUpperCase()));
    const supVendaIds = new Set(supVendas.map(v => v.id));
    const supItens = filteredItens.filter(it => supVendaIds.has(it.venda_id));

    const ticketMedio = sup.vendas > 0 ? sup.faturamento / sup.vendas : 0;
    const mediaProdutos = sup.vendas > 0 ? sup.produtos / sup.vendas : 0;
    const totalCombos = supVendas.filter(v => v.e_combo).length;
    const percCombos = sup.vendas > 0 ? (totalCombos / sup.vendas) * 100 : 0;
    const totalDCC = supVendas.filter(v => /(?:d[ée]bito|dcc)/i.test(v.forma_pagamento || '')).length;
    const percDCC = sup.vendas > 0 ? (totalDCC / sup.vendas) * 100 : 0;
    const ticketMaximo = supVendas.reduce((max, v) => v.valor_total > max ? v.valor_total : max, 0);
    const lider = sup.vendedores[0];

    // Gráfico: faturamento por vendedor
    const dataVendedores = sup.vendedores.map(v => ({
      nome: v.nome.split(' ').slice(0, 2).join(' '),
      faturamento: v.faturamento,
      vendas: v.vendas,
    }));

    // Gráfico: mix por categoria (pizza)
    const catMap: Record<string, number> = {};
    supItens.forEach(it => {
      const c = it.categoria_principal || 'OUTROS';
      catMap[c] = (catMap[c] || 0) + 1;
    });
    const dataCategorias = Object.entries(catMap)
      .map(([nome, qtd]) => ({ nome, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 6);

    // Gráfico: tipo de venda (UP vs Novas)
    const tipoVendaMap: Record<string, number> = {};
    supVendas.forEach(v => {
      const raw = (v.tipo_venda || 'NOVA').toString().toUpperCase().trim();
      const key = raw.startsWith('UP') ? 'Upgrade' : raw.startsWith('NOV') || raw === '' ? 'Novas' : raw;
      tipoVendaMap[key] = (tipoVendaMap[key] || 0) + 1;
    });
    const dataTipoVenda = Object.entries(tipoVendaMap)
      .map(([nome, value]) => ({ nome, value }))
      .sort((a, b) => b.value - a.value);
    const totalTipoVenda = dataTipoVenda.reduce((s, d) => s + d.value, 0);
    const upgradeCount = tipoVendaMap['Upgrade'] || 0;
    const percUpgrade = totalTipoVenda > 0 ? (upgradeCount / totalTipoVenda) * 100 : 0;

    // Gráfico: evolução diária de vendas
    const diaMap: Record<string, { data: string; vendas: number; faturamento: number }> = {};
    supVendas.forEach(v => {
      const d = (v.data_instalacao || '').slice(0, 10);
      if (!d) return;
      if (!diaMap[d]) diaMap[d] = { data: d, vendas: 0, faturamento: 0 };
      diaMap[d].vendas += 1;
      diaMap[d].faturamento += v.valor_total;
    });
    const dataEvolucao = Object.values(diaMap)
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(d => ({
        ...d,
        label: d.data.split('-').reverse().slice(0, 2).join('/'),
      }));

    const COLORS = ['hsl(var(--primary))', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];
    const maxVendedor = sup.vendedores[0]?.faturamento || 1;

    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card rounded-xl border border-border p-5 sm:p-6"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Equipe</p>
                <h2 className="text-xl sm:text-3xl font-bold text-foreground tracking-tight">{sup.nome}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {sup.vendedores.length} vendedores · {sup.vendas} vendas no período
                </p>
              </div>
            </div>
            {lider && (
              <div className="bg-card/80 backdrop-blur rounded-lg border border-border px-3 py-2 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Líder da equipe</p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">{lider.nome}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Faturamento', value: fmt(sup.faturamento), icon: DollarSign, comp: sup.compFaturamento, current: sup.faturamento },
            { label: 'Vendas', value: sup.vendas, icon: Package, comp: sup.compVendas, current: sup.vendas },
            { label: 'Virtua', value: sup.vendasInternet, icon: Wifi, comp: sup.compVendasInternet, current: sup.vendasInternet },
            { label: 'Ticket Médio', value: fmt(ticketMedio), icon: Target },
            { label: '% DCC', value: `${percDCC.toFixed(1)}%`, icon: Trophy },
            { label: 'Maior venda', value: fmt(ticketMaximo), icon: TrendingUp },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="bg-card rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {kpi.icon ? <kpi.icon className="h-3 w-3 text-muted-foreground" /> : null}
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-sm sm:text-base font-bold text-foreground tabular-nums">{kpi.value}</p>
              {hasComparison && kpi.comp !== undefined && kpi.current !== undefined && (
                <div className="mt-1">
                  <VariationBadge current={kpi.current} previous={kpi.comp} />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Gráficos linha 1: Faturamento por vendedor + Mix categorias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">Faturamento por vendedor</h3>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataVendedores} margin={{ top: 8, right: 4, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nome" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                  <Tooltip
                    {...chartTooltip}
                    labelFormatter={(label) => titleCase(label)}
                    formatter={(v: number) => [fmt(v), 'Faturamento']}
                  />
                  <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} stroke="#ffffff" strokeWidth={2}  animationDuration={1400} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">Mix de produtos</h3>
            <div className="w-full" style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataCategorias} dataKey="qtd" nameKey="nome" cx="50%" cy="50%" innerRadius="40%" outerRadius="75%" paddingAngle={3} stroke="#ffffff" strokeWidth={3} animationDuration={1400} animationEasing="ease-out">
                    {dataCategorias.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...chartTooltip}
                    formatter={(value: number, name: string) => [`${value} un.`, titleCase(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Gráficos linha 2: Evolução + Combos vs Singles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
          <div className="lg:col-span-2 bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">Evolução diária — vendas e faturamento</h3>
            {dataEvolucao.length > 1 ? (
              <div className="w-full" style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataEvolucao} margin={{ top: 8, right: 4, left: -16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={32} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                    <Tooltip
                      {...chartTooltip}
                      labelFormatter={(label) => label}
                      formatter={(value: number, name: string) => name === 'Faturamento' ? [fmt(value), name] : [`${value} vendas`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="vendas" name="Vendas" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff', stroke: 'hsl(var(--primary))', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ffffff', stroke: 'hsl(var(--primary))', strokeWidth: 2.5 }}  animationDuration={1400} animationEasing="ease-out" />
                    <Line yAxisId="right" type="monotone" dataKey="faturamento" name="Faturamento" stroke="hsl(160, 84%, 39%)" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff', stroke: 'hsl(160, 84%, 39%)', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ffffff', stroke: 'hsl(160, 84%, 39%)', strokeWidth: 2.5 }}  animationDuration={1400} animationEasing="ease-out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                Dados insuficientes para evolução temporal.
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">Tipo de venda (UP vs Novas)</h3>
            <div className="w-full" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataTipoVenda} dataKey="value" nameKey="nome" cx="50%" cy="50%" innerRadius="45%" outerRadius="78%" paddingAngle={4} stroke="#ffffff" strokeWidth={3} animationDuration={1400} animationEasing="ease-out">
                    {dataTipoVenda.map((d, i) => (
                      <Cell key={d.nome} fill={d.nome === 'Upgrade' ? 'hsl(38, 92%, 50%)' : d.nome === 'Novas' ? 'hsl(var(--primary))' : COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...chartTooltip}
                    formatter={(value: number, name: string) => [`${value} vendas`, titleCase(name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-1">
              {percUpgrade.toFixed(1)}% das vendas são upgrades
            </p>
          </div>
        </div>

        {/* Tabela detalhada de vendedores */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Detalhe por vendedor</h3>
            <span className="text-[10px] text-muted-foreground">Média: {fmt(ticketMedio)} · {mediaProdutos.toFixed(1)} prod/venda</span>
          </div>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <table className="w-full text-xs min-w-[420px]">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2 font-medium">#</th>
                  <th className="text-left py-2 font-medium">Vendedor</th>
                  <th className="text-right py-2 font-medium">Faturamento</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Share</th>
                  <th className="text-right py-2 font-medium">Vendas</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">Virtua</th>
                  <th className="text-right py-2 font-medium hidden md:table-cell">Produtos</th>
                  <th className="text-right py-2 font-medium hidden md:table-cell">Ticket Méd.</th>
                </tr>
              </thead>
              <tbody>
                {sup.vendedores.map((v, i) => {
                  const share = sup.faturamento > 0 ? (v.faturamento / sup.faturamento) * 100 : 0;
                  const ticket = v.vendas > 0 ? v.faturamento / v.vendas : 0;
                  const barWidth = (v.faturamento / maxVendedor) * 100;
                  return (
                    <tr key={v.nome} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                      <td className="py-2.5 text-muted-foreground tabular-nums w-8">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td className="py-2.5 text-foreground font-medium">{v.nome}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden sm:block w-16 h-1 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                          <span className="text-foreground">{fmt(v.faturamento)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{share.toFixed(1)}%</td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">{v.vendas}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{v.vendasInternet}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{v.produtos}</td>
                      <td className="py-2.5 text-right tabular-nums text-muted-foreground hidden md:table-cell">{fmt(ticket)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Supervisão</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {isSupervisor ? `Equipe de ${supervisoresVinculados.join(', ') || supervisorVinculado}` : `Visão por equipe e supervisor — ${supervisores.length} supervisores`}
        </p>
      </div>

      {supervisores.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-xs text-muted-foreground">Nenhum dado de supervisão encontrado para o período selecionado.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {pagedSupervisores.map(sup => (
          <div key={sup.nome} className="bg-card rounded-lg border border-border p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground">{sup.nome}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{sup.vendedores.length} vendedores</p>
              </div>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Faturamento</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{fmt(sup.faturamento)}</p>
                {hasComparison && sup.compFaturamento !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{fmt(sup.compFaturamento)}</span>
                    <VariationBadge current={sup.faturamento} previous={sup.compFaturamento} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Vendas</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.vendas}</p>
                {hasComparison && sup.compVendas !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compVendas}</span>
                    <VariationBadge current={sup.vendas} previous={sup.compVendas} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Produtos</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.produtos}</p>
                {hasComparison && sup.compProdutos !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compProdutos}</span>
                    <VariationBadge current={sup.produtos} previous={sup.compProdutos} />
                  </div>
                )}
              </div>
              <div className="bg-surface rounded-md p-2 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider">Virtua</p>
                <p className="text-sm sm:text-lg font-bold text-foreground tabular-nums">{sup.vendasInternet}</p>
                {hasComparison && sup.compVendasInternet !== undefined && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] text-muted-foreground tabular-nums">{sup.compVendasInternet}</span>
                    <VariationBadge current={sup.vendasInternet} previous={sup.compVendasInternet} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Equipe</p>
              <div className="flex items-center text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
                <span className="flex-1">Vendedor</span>
                <span className="w-20 text-right">Faturam.</span>
                <span className="w-12 text-right">Virtua</span>
                <span className="w-12 text-right">Prod.</span>
              </div>
              <div className="space-y-1">
                {sup.vendedores.map(v => (
                  <div key={v.nome} className="flex items-center text-xs px-0.5">
                    <span className="text-foreground truncate flex-1 mr-2">{v.nome}</span>
                    <span className="text-muted-foreground tabular-nums w-20 text-right shrink-0">{fmt(v.faturamento)}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right shrink-0">{v.vendasInternet}</span>
                    <span className="text-muted-foreground tabular-nums w-12 text-right shrink-0">{v.produtos}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Página {page + 1} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
