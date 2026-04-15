import { useFilteredData, calcVariation } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { KPICard } from './KPICard';
import { DollarSign, ShoppingCart, Layers, Receipt, TrendingUp, BarChart3, Target, Wifi } from 'lucide-react';
import { getMonthlyGoalFromStore } from '@/lib/monthly-goals';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n: number) => n.toLocaleString('pt-BR');

export function TabKPIs() {
  const { stats, compStats, hasComparison } = useFilteredData();
  const { filters, monthlyGoals } = useFilters();

  const goals = getMonthlyGoalFromStore(monthlyGoals, filters.dataInicio);

  const atingFat = goals.meta_faturamento > 0 ? (stats.faturamento / goals.meta_faturamento) * 100 : 0;
  const atingVendas = goals.meta_total_vendas > 0 ? (stats.totalVendas / goals.meta_total_vendas) * 100 : 0;
  const atingVirtua = goals.meta_vendas_virtua > 0 ? (stats.vendasInternet / goals.meta_vendas_virtua) * 100 : 0;
  const faltaFat = Math.max(0, goals.meta_faturamento - stats.faturamento);
  const faltaVendas = Math.max(0, goals.meta_total_vendas - stats.totalVendas);
  const faltaVirtua = Math.max(0, goals.meta_vendas_virtua - stats.vendasInternet);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Indicadores de Performance</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">KPIs detalhados do período</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <KPICard title="Faturamento Total" value={fmt(stats.faturamento)} icon={DollarSign}
          compValue={hasComparison && compStats ? fmt(compStats.faturamento) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.faturamento, compStats.faturamento) : undefined}
        />
        <KPICard title="Vendas Totais" value={fmtNum(stats.totalVendas)} icon={ShoppingCart}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalVendas) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalVendas, compStats.totalVendas) : undefined}
        />
        <KPICard title="Vendas Internet" value={fmtNum(stats.vendasInternet)} icon={Wifi}
          compValue={hasComparison && compStats ? fmtNum(compStats.vendasInternet) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.vendasInternet, compStats.vendasInternet) : undefined}
        />
        <KPICard title="Combos Totais" value={fmtNum(stats.totalCombos)} icon={Layers}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalCombos) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalCombos, compStats.totalCombos) : undefined}
        />
        <KPICard title="Ticket Médio" value={fmt(stats.ticketMedio)} icon={Receipt}
          compValue={hasComparison && compStats ? fmt(compStats.ticketMedio) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.ticketMedio, compStats.ticketMedio) : undefined}
        />
        <KPICard title="Fat. Médio/Vend." value={fmt(stats.vendedoresAtivos > 0 ? stats.faturamento / stats.vendedoresAtivos : 0)} icon={TrendingUp} />
        <KPICard
          title="DCC"
          value={fmtNum(stats.totalDebitoConta)}
          icon={BarChart3}
          compValue={hasComparison && compStats ? fmtNum(compStats.totalDebitoConta) : undefined}
          compTrend={hasComparison && compStats ? calcVariation(stats.totalDebitoConta, compStats.totalDebitoConta) : undefined}
        />
        <KPICard title="% Combos" value={`${stats.percCombos.toFixed(1)}%`} icon={Layers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Meta de Faturamento */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Meta de Faturamento</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold text-foreground tabular-nums">{fmt(stats.faturamento)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-semibold text-foreground tabular-nums">{fmt(goals.meta_faturamento)}</span>
            </div>
            <div className="ranking-bar">
              <div className="ranking-bar-fill" style={{ width: `${Math.min(atingFat, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-primary tabular-nums">{atingFat.toFixed(1)}% atingido</span>
              <span className="text-muted-foreground tabular-nums">Faltam {fmt(faltaFat)}</span>
            </div>
          </div>
        </div>

        {/* Meta de Vendas */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Meta de Vendas</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold text-foreground tabular-nums">{fmtNum(stats.totalVendas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-semibold text-foreground tabular-nums">{fmtNum(goals.meta_total_vendas)}</span>
            </div>
            <div className="ranking-bar">
              <div className="ranking-bar-fill" style={{ width: `${Math.min(atingVendas, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-primary tabular-nums">{atingVendas.toFixed(1)}% atingido</span>
              <span className="text-muted-foreground tabular-nums">Faltam {fmtNum(faltaVendas)}</span>
            </div>
          </div>
        </div>

        {/* Meta de Vendas Internet (Virtua) */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wifi className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Meta Internet (Virtua)</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold text-foreground tabular-nums">{fmtNum(stats.vendasInternet)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Meta</span>
              <span className="font-semibold text-foreground tabular-nums">{fmtNum(goals.meta_vendas_virtua)}</span>
            </div>
            <div className="ranking-bar">
              <div className="ranking-bar-fill" style={{ width: `${Math.min(atingVirtua, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-primary tabular-nums">{atingVirtua.toFixed(1)}% atingido</span>
              <span className="text-muted-foreground tabular-nums">Faltam {fmtNum(faltaVirtua)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
