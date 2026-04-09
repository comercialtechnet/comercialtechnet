import { useFilteredData } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(347,77%,50%)', 'hsl(38,92%,50%)', 'hsl(160,84%,39%)', 'hsl(199,89%,48%)', 'hsl(215,16%,47%)'];
const COLORS_FADED = ['hsl(217,91%,80%)', 'hsl(271,91%,82%)', 'hsl(347,77%,75%)', 'hsl(38,92%,75%)', 'hsl(160,84%,65%)', 'hsl(199,89%,72%)', 'hsl(215,16%,72%)'];
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function TabGraficos() {
  const { filteredVendas, stats, compFilteredVendas, compStats, hasComparison } = useFilteredData();
  const { filters } = useFilters();

  const currentLabel = formatPeriodLabel(filters.dataInicio) || 'Atual';
  const compLabel = formatPeriodLabel(filters.compDataInicio) || 'Anterior';

  // Daily data - current period
  const daily: Record<string, { date: string; faturamento: number; vendas: number; combos: number }> = {};
  filteredVendas.forEach(v => {
    const d = v.data_instalacao.slice(5); // MM-DD for comparison
    if (!daily[d]) daily[d] = { date: d, faturamento: 0, vendas: 0, combos: 0 };
    daily[d].faturamento += v.valor_total;
    daily[d].vendas += 1;
    if (v.e_combo) daily[d].combos += 1;
  });

  // Daily data - comparison period (normalized to day-of-month)
  const compDaily: Record<string, { compFaturamento: number; compVendas: number; compCombos: number }> = {};
  if (hasComparison) {
    compFilteredVendas.forEach(v => {
      const d = v.data_instalacao.slice(5);
      if (!compDaily[d]) compDaily[d] = { compFaturamento: 0, compVendas: 0, compCombos: 0 };
      compDaily[d].compFaturamento += v.valor_total;
      compDaily[d].compVendas += 1;
      if (v.e_combo) compDaily[d].compCombos += 1;
    });
  }

  // Merge for line charts - use day number for alignment
  const allDays = new Set([...Object.keys(daily), ...Object.keys(compDaily)]);
  const dailyData = Array.from(allDays)
    .sort()
    .map(d => ({
      date: d,
      faturamento: daily[d]?.faturamento || 0,
      vendas: daily[d]?.vendas || 0,
      combos: daily[d]?.combos || 0,
      compFaturamento: compDaily[d]?.compFaturamento || 0,
      compVendas: compDaily[d]?.compVendas || 0,
      compCombos: compDaily[d]?.compCombos || 0,
    }));

  // Tipo de venda - current
  const tipoVenda: Record<string, number> = {};
  filteredVendas.forEach(v => { tipoVenda[v.tipo_venda] = (tipoVenda[v.tipo_venda] || 0) + 1; });
  const tipoVendaData = Object.entries(tipoVenda).map(([name, value]) => ({ name, value }));

  const compTipoVenda: Record<string, number> = {};
  if (hasComparison) {
    compFilteredVendas.forEach(v => { compTipoVenda[v.tipo_venda] = (compTipoVenda[v.tipo_venda] || 0) + 1; });
  }
  const compTipoVendaData = Object.entries(compTipoVenda).map(([name, value]) => ({ name, value }));

  // Tipo de cliente
  const tipoCliente: Record<string, number> = {};
  filteredVendas.forEach(v => { tipoCliente[v.tipo_cliente === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'] = (tipoCliente[v.tipo_cliente === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'] || 0) + 1; });
  const tipoClienteData = Object.entries(tipoCliente).map(([name, value]) => ({ name, value }));

  const compTipoCliente: Record<string, number> = {};
  if (hasComparison) {
    compFilteredVendas.forEach(v => { compTipoCliente[v.tipo_cliente === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'] = (compTipoCliente[v.tipo_cliente === 'F' ? 'Pessoa Física' : 'Pessoa Jurídica'] || 0) + 1; });
  }
  const compTipoClienteData = Object.entries(compTipoCliente).map(([name, value]) => ({ name, value }));

  // Forma pagamento
  const formaPag: Record<string, number> = {};
  filteredVendas.forEach(v => { formaPag[v.forma_pagamento] = (formaPag[v.forma_pagamento] || 0) + 1; });
  const formaPagData = Object.entries(formaPag).map(([name, value]) => ({ name, value }));

  const compFormaPag: Record<string, number> = {};
  if (hasComparison) {
    compFilteredVendas.forEach(v => { compFormaPag[v.forma_pagamento] = (compFormaPag[v.forma_pagamento] || 0) + 1; });
  }
  const compFormaPagData = Object.entries(compFormaPag).map(([name, value]) => ({ name, value }));

  // Top vendedores - current + comparison
  const topVend = Object.entries(stats.porVendedor)
    .sort((a, b) => b[1].faturamento - a[1].faturamento)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      faturamento: data.faturamento,
      compFaturamento: compStats?.porVendedor[name]?.faturamento || 0,
    }));

  const renderDualPie = (
    currentData: { name: string; value: number }[],
    compData: { name: string; value: number }[],
    colorOffset: number
  ) => (
    <div className={hasComparison && compData.length > 0 ? 'grid grid-cols-2 gap-1' : ''}>
      <div>
        {hasComparison && compData.length > 0 && <p className="text-[10px] font-medium text-center text-primary mb-1">{currentLabel}</p>}
        <ResponsiveContainer width="100%" height={hasComparison && compData.length > 0 ? 180 : 220}>
          <PieChart>
            <Pie data={currentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={hasComparison ? 55 : 75} label={!hasComparison ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : undefined} fontSize={10}>
              {currentData.map((_, i) => <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {hasComparison && compData.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-center text-muted-foreground mb-1">{compLabel}</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={compData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} fontSize={10} opacity={0.5}>
                {compData.map((_, i) => <Cell key={i} fill={COLORS_FADED[(i + colorOffset) % COLORS_FADED.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Gráficos</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visualizações interativas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Evolução Faturamento */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Evolução Diária — Faturamento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 9 }} width={35} />
              <Tooltip formatter={(v: number, name: string) => [fmt(v), name === 'compFaturamento' ? compLabel : currentLabel]} />
              <Line type="monotone" dataKey="faturamento" name={currentLabel} stroke="hsl(347,77%,50%)" strokeWidth={2} dot={false} />
              {hasComparison && (
                <Line type="monotone" dataKey="compFaturamento" name={compLabel} stroke="hsl(347,77%,75%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              )}
              {hasComparison && <Legend wrapperStyle={{ fontSize: 10 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Evolução Vendas */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Evolução Diária — Vendas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={25} />
              <Tooltip />
              <Line type="monotone" dataKey="vendas" name={`Vendas (${currentLabel})`} stroke="hsl(217,91%,60%)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="combos" name={`Combos (${currentLabel})`} stroke="hsl(160,84%,39%)" strokeWidth={2} dot={false} />
              {hasComparison && (
                <>
                  <Line type="monotone" dataKey="compVendas" name={`Vendas (${compLabel})`} stroke="hsl(217,91%,80%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="compCombos" name={`Combos (${compLabel})`} stroke="hsl(160,84%,65%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </>
              )}
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo de Venda */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Tipo de Venda</h3>
          {renderDualPie(tipoVendaData, compTipoVendaData, 0)}
        </div>

        {/* Tipo de Cliente */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Tipo de Cliente</h3>
          {renderDualPie(tipoClienteData, compTipoClienteData, 2)}
        </div>

        {/* Forma Pagamento */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Forma de Pagamento</h3>
          {renderDualPie(formaPagData, compFormaPagData, 4)}
        </div>

        {/* Top Vendedores */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Top Vendedores por Faturamento</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topVend} layout="vertical" margin={{ left: 60, right: 10 }}>
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              {hasComparison && compStats && (
                <Bar dataKey="compFaturamento" name={compLabel} fill="hsl(347,77%,75%)" radius={[0, 4, 4, 0]} opacity={0.4} />
              )}
              <Bar dataKey="faturamento" name={currentLabel} fill="hsl(347,77%,50%)" radius={[0, 4, 4, 0]} />
              {hasComparison && compStats && <Legend wrapperStyle={{ fontSize: 10 }} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
