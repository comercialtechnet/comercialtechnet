import { useState } from 'react';
import { useFilteredData } from '@/lib/use-filtered-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { chartTooltip, titleCase } from '@/lib/chart-tooltip';


const CATEGORY_COLORS: Record<string, string> = {
  'Internet': 'hsl(217, 91%, 60%)',
  'TV': 'hsl(271, 91%, 65%)',
  'Móvel': 'hsl(347, 77%, 50%)',
  'Telefone / VOIP': 'hsl(38, 92%, 50%)',
  'WiFi Mesh': 'hsl(160, 84%, 39%)',
  'Ponto Extra': 'hsl(199, 89%, 48%)',
  'Mudança de Tecnologia': 'hsl(25, 95%, 53%)',
  'Adicionais': 'hsl(215, 16%, 47%)',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabProdutos() {
  const { stats, filteredItens, compStats, hasComparison } = useFilteredData();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const tooltipTrigger: 'click' | 'hover' = isMobile ? 'click' : 'hover';

  const detalhesPorCategoria = (() => {
    const grouped: Record<string, Record<string, { count: number; fat: number }>> = {};

    filteredItens.forEach(it => {
      const categoria = it.categoria_principal || 'Sem categoria';
      const nomeProduto = (it.descricao_normalizada || 'NÃO IDENTIFICADO').trim();

      if (nomeProduto === 'PRODUTO NÃO IDENTIFICADO' && it.valor_item === 0) return;

      if (!grouped[categoria]) grouped[categoria] = {};
      if (!grouped[categoria][nomeProduto]) grouped[categoria][nomeProduto] = { count: 0, fat: 0 };

      grouped[categoria][nomeProduto].count += 1;
      grouped[categoria][nomeProduto].fat += it.valor_item;
    });

    return Object.fromEntries(
      Object.entries(grouped).map(([categoria, itens]) => [
        categoria,
        Object.entries(itens)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 30),
      ]),
    );
  })();

  const catData = Object.entries(stats.porCategoria)
    .sort((a, b) => b[1].quantidade - a[1].quantidade)
    .map(([name, data]) => {
      const compCat = compStats?.porCategoria[name];
      return {
        name,
        ...data,
        compQuantidade: compCat?.quantidade || 0,
        detalhes: detalhesPorCategoria[name] || [],
      };
    });

  const topProdutos = (() => {
    const map: Record<string, { count: number; fat: number }> = {};
    filteredItens.forEach(it => {
      if ((it.descricao_normalizada || '').trim().toUpperCase() === 'PRODUTO NÃO IDENTIFICADO' && it.valor_item === 0) return;
      const key = it.descricao_normalizada;
      if (!map[key]) map[key] = { count: 0, fat: 0 };
      map[key].count++;
      map[key].fat += it.valor_item;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  })();


  const adicionaisDetalhes = (() => {
    const map: Record<string, { count: number; fat: number }> = {};
    filteredItens
      .filter(it => it.categoria_principal === 'Adicionais')
      .forEach(it => {
        if ((it.descricao_normalizada || '').trim().toUpperCase() === 'PRODUTO NÃO IDENTIFICADO' && it.valor_item === 0) return;
        const key = it.descricao_normalizada || 'NÃO IDENTIFICADO';
        if (!map[key]) map[key] = { count: 0, fat: 0 };
        map[key].count += 1;
        map[key].fat += it.valor_item;
      });

    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  })();

  const totalFat = Object.values(stats.porCategoria).reduce((s, c) => s + c.faturamento, 0);
  const topProdutosMaxCount = topProdutos[0]?.[1].count ?? 1;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Mix de Produtos</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Análise de categorias e produtos vendidos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {catData.map(cat => {
          const isOpen = openCategory === cat.name;
          const hasDetails = cat.detalhes.length > 0;
          return (
            <div key={cat.name} className="relative">
              <button
                onClick={() => hasDetails && setOpenCategory(prev => prev === cat.name ? null : cat.name)}
                className={`w-full text-left bg-card rounded-lg border p-3 sm:p-4 transition-all ${isOpen ? 'border-primary shadow-md' : 'border-border'} ${hasDetails ? 'active:scale-[0.98] hover:border-primary/40' : ''}`}
                aria-expanded={isOpen}
                disabled={!hasDetails}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#94a3b8' }} />
                  <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate flex-1">{cat.name}</span>
                  {hasDetails && (
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{cat.quantidade}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums truncate">{fmt(cat.faturamento)}</p>
                <p className="text-[10px] sm:text-xs text-primary tabular-nums">{totalFat > 0 ? ((cat.faturamento / totalFat) * 100).toFixed(1) : 0}%</p>
              </button>

              {hasDetails && isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20">
                  <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-xl p-2">
                    <p className="text-[10px] sm:text-xs font-semibold mb-2 px-1">Itens em {cat.name}</p>
                    <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
                      {cat.detalhes.map(([nome, data]) => (
                        <div key={`${cat.name}-${nome}`} className="flex items-center justify-between gap-2 text-[10px] sm:text-xs px-1 py-1 rounded hover:bg-accent/50">
                          <span className="truncate">{nome}</span>
                          <span className="text-muted-foreground tabular-nums shrink-0">{data.count} • {fmt(data.fat)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quantidade por Categoria</h3>
          <ResponsiveContainer width="100%" height={430}>
            <BarChart data={catData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-35} textAnchor="end" height={80} interval={0} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip {...chartTooltip} trigger={tooltipTrigger} labelFormatter={(label) => titleCase(label)} formatter={(v: number, name: string) => [`${v} un.`, titleCase(name)]} />
              {hasComparison && compStats && (
                <Bar dataKey="compQuantidade" name="Período anterior" radius={[4, 4, 0, 0]} opacity={0.3} stroke="#ffffff" strokeWidth={2} animationDuration={1400} animationEasing="ease-out">
                  {catData.map(entry => (
                    <Cell key={`comp-${entry.name}`} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Bar>
              )}
              <Bar dataKey="quantidade" name="Período atual" radius={[4, 4, 0, 0]} stroke="#ffffff" strokeWidth={2} animationDuration={1400} animationEasing="ease-out">
                {catData.map(entry => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#94a3b8'} />
                ))}
                <LabelList dataKey="quantidade" position="top" style={{ fontSize: 9, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top 10 Produtos Mais Vendidos</h3>
          <div className="space-y-2">
            {topProdutos.map(([name, data], i) => (
              <div key={name} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs font-mono text-muted-foreground w-4 sm:w-5 tabular-nums shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-foreground truncate">{name}</p>
                  <div className="ranking-bar mt-1">
                    <div className="ranking-bar-fill" style={{ width: `${(data.count / topProdutosMaxCount) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] sm:text-xs font-semibold text-foreground tabular-nums">{data.count}</p>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground tabular-nums">{fmt(data.fat)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
