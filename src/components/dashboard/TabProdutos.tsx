import { useFilteredData } from '@/lib/use-filtered-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

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
  'Mudança de Tecnologia': 'hsl(25, 95%, 53%)',
  'Adicionais': 'hsl(215, 16%, 47%)',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabProdutos() {
  const { stats, filteredItens } = useFilteredData();

  const catData = Object.entries(stats.porCategoria)
    .sort((a, b) => b[1].faturamento - a[1].faturamento)
    .map(([name, data]) => ({ name, ...data }));

  const topProdutos = (() => {
    const map: Record<string, { count: number; fat: number }> = {};
    filteredItens.forEach(it => {
      const key = it.descricao_normalizada;
      if (!map[key]) map[key] = { count: 0, fat: 0 };
      map[key].count++;
      map[key].fat += it.valor_item;
    });
    return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  })();

  const totalFat = Object.values(stats.porCategoria).reduce((s, c) => s + c.faturamento, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Mix de Produtos</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Análise de categorias e produtos vendidos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {catData.map(cat => (
          <div key={cat.name} className="bg-card rounded-lg border border-border p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#94a3b8' }} />
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate">{cat.name}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground tabular-nums">{cat.quantidade}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">{fmt(cat.faturamento)}</p>
            <p className="text-[10px] sm:text-xs text-primary tabular-nums">{totalFat > 0 ? ((cat.faturamento / totalFat) * 100).toFixed(1) : 0}%</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Quantidade por Categoria</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData}>
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} interval={0} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip {...themedTooltip} labelFormatter={(label) => label} />
              <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
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
                    <div className="ranking-bar-fill" style={{ width: `${(data.count / topProdutos[0][1].count) * 100}%` }} />
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
