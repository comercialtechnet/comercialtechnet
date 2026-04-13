import { useState } from 'react';
import { useFilteredData } from '@/lib/use-filtered-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Medal, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type MetricKey = 'faturamento' | 'vendas' | 'produtos' | 'combos';

const PAGE_SIZE = 10;

export function TabRanking() {
  const { stats } = useFilteredData();
  const [metric, setMetric] = useState<MetricKey>('faturamento');
  const [page, setPage] = useState(0);

  const ranking = Object.entries(stats.porVendedor)
    .map(([nome, data]) => ({ nome, ...data }))
    .sort((a, b) => b[metric] - a[metric]);

  const totalPages = Math.max(1, Math.ceil(ranking.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pagedRanking = ranking.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const globalOffset = currentPage * PAGE_SIZE;

  const maxVal = ranking[0]?.[metric] || 1;
  const trophyIcons = [Trophy, Medal, Award];

  const rankingSup = Object.entries(stats.porSupervisor)
    .map(([nome, data]) => ({ nome, faturamento: data.faturamento, vendas: data.vendas, produtos: data.produtos, combos: data.combos, numVendedores: data.vendedores.size }))
    .sort((a, b) => b[metric] - a[metric]);

  const maxValSup = rankingSup[0]?.[metric] || 1;

  const formatValue = (v: number, m: MetricKey) => m === 'faturamento' ? fmt(v) : String(v);

  // Reset page when metric changes
  const handleMetricChange = (v: string) => {
    setMetric(v as MetricKey);
    setPage(0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Ranking</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Performance por vendedor e supervisor</p>
        </div>
        <Select value={metric} onValueChange={handleMetricChange}>
          <SelectTrigger className="w-full sm:w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="faturamento">Faturamento</SelectItem>
            <SelectItem value="vendas">Vendas</SelectItem>
            <SelectItem value="produtos">Produtos</SelectItem>
            <SelectItem value="combos">Combos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking de Vendedores</h3>
          <div className="space-y-2.5 sm:space-y-3">
            {pagedRanking.map((v, i) => {
              const globalIndex = globalOffset + i;
              const Icon = globalIndex < 3 ? trophyIcons[globalIndex] : null;
              return (
                <div key={v.nome} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 sm:w-7 flex justify-center shrink-0">
                    {Icon ? <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${globalIndex === 0 ? 'text-yellow-500' : globalIndex === 1 ? 'text-slate-400' : 'text-amber-600'}`} /> : <span className="text-[10px] sm:text-xs font-mono text-muted-foreground tabular-nums">{globalIndex + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{v.nome}</p>
                    <div className="ranking-bar mt-1">
                      <div className="ranking-bar-fill" style={{ width: `${(v[metric] / maxVal) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums shrink-0">{formatValue(v[metric], metric)}</span>
                </div>
              );
            })}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {globalOffset + 1}–{Math.min(globalOffset + PAGE_SIZE, ranking.length)} de {ranking.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums px-1">{currentPage + 1}/{totalPages}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ranking de Supervisores</h3>
          <div className="space-y-2.5 sm:space-y-3">
            {rankingSup.map((s, i) => {
              const Icon = i < 3 ? trophyIcons[i] : null;
              return (
                <div key={s.nome} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 sm:w-7 flex justify-center shrink-0">
                    {Icon ? <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : 'text-amber-600'}`} /> : <span className="text-[10px] sm:text-xs font-mono text-muted-foreground tabular-nums">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{s.nome}</p>
                    <p className="text-[10px] text-muted-foreground">{s.numVendedores} vendedores</p>
                    <div className="ranking-bar mt-1">
                      <div className="ranking-bar-fill" style={{ width: `${(s[metric] / maxValSup) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums shrink-0">{formatValue(s[metric], metric)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
