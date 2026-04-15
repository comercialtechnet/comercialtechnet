import { useState } from 'react';
import { useFilteredData, calcVariation } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { KPICard } from './KPICard';
import { DollarSign, ShoppingCart, Package, Layers, Receipt, Users, UserCheck, Wifi } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

const COLORS_LIST = ['hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(347,77%,50%)', 'hsl(38,92%,50%)', 'hsl(160,84%,39%)', 'hsl(199,89%,48%)', 'hsl(215,16%,47%)'];

const themedTooltip = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '4px' },
  itemStyle: { color: 'hsl(var(--foreground))', fontSize: '11px' },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Internet': 'hsl(217, 91%, 60%)',
  'TV': 'hsl(271, 91%, 65%)',
  'Móvel': 'hsl(347, 77%, 50%)',
  'Telefone / VOIP': 'hsl(38, 92%, 50%)',
  'WiFi Mesh': 'hsl(160, 84%, 39%)',
  'Ponto Extra': 'hsl(199, 89%, 48%)',
  'Adicionais': 'hsl(215, 16%, 47%)',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n: number) => n.toLocaleString('pt-BR');

export function TabResumo() {
  const { stats, compStats, hasComparison } = useFilteredData();
  const { filters } = useFilters();
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);

  const currentLabel = formatPeriodLabel(filters.dataInicio) || 'Atual';
  const compLabel = formatPeriodLabel(filters.compDataInicio) || 'Anterior';

  const catData = Object.entries(stats.porCategoria)
    .sort((a, b) => b[1].faturamento - a[1].faturamento)
    .map(([name, data]) => {
      const compCat = compStats?.porCategoria[name];
      return {
        name,
        ...data,
        compFaturamento: compCat?.faturamento || 0,
        compQuantidade: compCat?.quantidade || 0,
      };
    });

  const topCategoryData = Object.entries(stats.porCategoria)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .slice(0, 5)
    .map(([name, data]) => ({ name, value: data.quantidade }));

  const compTopCategoryData = compStats
    ? Object.entries(compStats.porCategoria)
      .sort((a, b) => b[1].quantidade - a[1].quantidade)
      .slice(0, 5)
      .map(([name, data]) => ({ name, value: data.quantidade }))
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Performance Comercial</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visão executiva do período selecionado</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <KPICard
          title="Faturamento"
          value={fmt(stats.faturamento)}
          icon={DollarSign}
          compValue={hasComparison && compStats ? fmt(compStats.faturamento) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.faturamento, compStats.faturamento) : undefined}
        />
        <KPICard
          title="Qtd. Vendas"
          value={fmtNum(stats.totalVendas)}
          icon={ShoppingCart}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalVendas) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalVendas, compStats.totalVendas) : undefined}
        />
        <KPICard
          title="Qtd. Virtua"
          value={fmtNum(stats.vendasInternet)}
          icon={Wifi}
          compValue={hasComparison && compStats ? fmtNum(compStats.vendasInternet) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.vendasInternet, compStats.vendasInternet) : undefined}
        />
        <KPICard
          title="Combos Vendidos"
          value={fmtNum(stats.totalCombos)}
          icon={Layers}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalCombos) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalCombos, compStats.totalCombos) : undefined}
        />
        <KPICard
          title="Faturamento por Venda (Média)"
          value={fmt(stats.ticketMedio)}
          icon={Receipt}
          compValue={hasComparison && compStats ? fmt(compStats.ticketMedio) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.ticketMedio, compStats.ticketMedio) : undefined}
        />
        <KPICard
          title="Qtd. Produtos"
          value={fmtNum(stats.totalProdutos)}
          icon={Package}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalProdutos) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalProdutos, compStats.totalProdutos) : undefined}
        />
        <KPICard title="Vendedores Ativos"
          value={String(stats.vendedoresAtivos)}
          icon={Users}
          compValue={hasComparison && compStats ? fmtNum(compStats.vendedoresAtivos) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.vendedoresAtivos, compStats.vendedoresAtivos) : undefined}
        />
        <KPICard title="Supervisores Ativos"
          value={String(stats.supervisoresAtivos)}
          icon={UserCheck}
          compValue={hasComparison && compStats ? fmtNum(compStats.supervisoresAtivos) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.supervisoresAtivos, compStats.supervisoresAtivos) : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento por Categoria</h3>
          <ResponsiveContainer width="100%" height={Math.max(220, catData.length * 40)}>
            <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 80, left: 5, bottom: 5 }}>
              <XAxis type="number" tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip {...themedTooltip} labelFormatter={(label) => label} formatter={(v: number, name: string) => [fmt(v), name === 'Período anterior' ? compLabel : currentLabel]} />
              {hasComparison && compStats && (
                <Bar dataKey="compFaturamento" name="Período anterior" radius={[0, 4, 4, 0]} opacity={0.3}>
                  {catData.map((entry) => (
                    <Cell key={`comp-${entry.name}`} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              )}
              <Bar dataKey="faturamento" name="Período atual" radius={[0, 4, 4, 0]}>
                {catData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                ))}
                <LabelList dataKey="faturamento" position="right" formatter={(v: number) => `R$ ${(v / 1000).toFixed(2)}k`} style={{ fontSize: 9, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Categorias (Quantidade)</h3>
          <div className={hasComparison && compTopCategoryData.length > 0 ? 'grid grid-cols-2 gap-2' : ''}>
            <div>
              {hasComparison && compTopCategoryData.length > 0 && (
                <p className="text-[10px] font-medium text-center text-primary mb-1">Atual</p>
              )}
              <ResponsiveContainer width="100%" height={hasComparison ? 180 : 200}>
                <PieChart>
                  <Pie
                    data={topCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={hasComparison ? 55 : 70}
                    innerRadius={hasComparison ? 25 : 30}
                    onClick={(data) => setActiveCategoryName(prev => prev === data.name ? null : data.name)}
                  >
                    {topCategoryData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={CATEGORY_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length]}
                        style={{ outline: 'none', cursor: 'pointer' }}
                        opacity={activeCategoryName === null || activeCategoryName === d.name ? 1 : 0.3}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={themedTooltip.contentStyle} itemStyle={themedTooltip.itemStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {topCategoryData.map((d, i) => {
                  const total = topCategoryData.reduce((s, x) => s + x.value, 0);
                  const perc = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
                  return (
                    <div
                      key={d.name}
                      className="flex items-center gap-1.5 text-[10px] cursor-pointer transition-opacity"
                      onClick={() => setActiveCategoryName(prev => prev === d.name ? null : d.name)}
                      style={{ opacity: activeCategoryName === null || activeCategoryName === d.name ? 1 : 0.3 }}
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length] }} />
                      <span className="text-foreground">{d.name}</span>
                      <span className="text-muted-foreground tabular-nums">{d.value} ({perc}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {hasComparison && compTopCategoryData.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-center text-muted-foreground mb-1">Anterior</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={compTopCategoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
                      innerRadius={25}
                      onClick={(data) => setActiveCategoryName(prev => prev === data.name ? null : data.name)}
                    >
                      {compTopCategoryData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={CATEGORY_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length]}
                          style={{ outline: 'none', cursor: 'pointer' }}
                          opacity={activeCategoryName === null || activeCategoryName === d.name ? 0.6 : 0.2}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={themedTooltip.contentStyle} itemStyle={themedTooltip.itemStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                  {compTopCategoryData.map((d, i) => {
                    const total = compTopCategoryData.reduce((s, x) => s + x.value, 0);
                    const perc = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
                    return (
                      <div
                        key={d.name}
                        className="flex items-center gap-1.5 text-[10px] cursor-pointer transition-opacity"
                        onClick={() => setActiveCategoryName(prev => prev === d.name ? null : d.name)}
                        style={{ opacity: activeCategoryName === null || activeCategoryName === d.name ? 1 : 0.3 }}
                      >
                        <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: CATEGORY_COLORS[d.name] || COLORS_LIST[i % COLORS_LIST.length] }} />
                        <span className="text-foreground">{d.name}</span>
                        <span className="text-muted-foreground tabular-nums">{d.value} ({perc}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
