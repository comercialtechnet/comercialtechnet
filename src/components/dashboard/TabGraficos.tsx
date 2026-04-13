import { useFilteredData } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';

const COLORS = ['hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(347,77%,50%)', 'hsl(38,92%,50%)', 'hsl(160,84%,39%)', 'hsl(199,89%,48%)', 'hsl(215,16%,47%)'];
const COLORS_FADED = ['hsl(217,91%,80%)', 'hsl(271,91%,82%)', 'hsl(347,77%,75%)', 'hsl(38,92%,75%)', 'hsl(160,84%,65%)', 'hsl(199,89%,72%)', 'hsl(215,16%,72%)'];
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPRESA_COLORS: Record<string, string> = {
  'VNA': 'hsl(217,91%,60%)',
  'RDT': 'hsl(347,77%,50%)',
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
    color: 'hsl(var(--foreground))',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  labelStyle: {
    color: 'hsl(var(--foreground))',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: 'hsl(var(--foreground))',
    fontSize: '11px',
  },
};

const pieTooltipStyle = {
  contentStyle: tooltipStyle.contentStyle,
  labelStyle: tooltipStyle.labelStyle,
  itemStyle: tooltipStyle.itemStyle,
};

const renderPieLabel = ({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`;

export function TabGraficos() {
  const { filteredVendas, stats, compFilteredVendas, compStats, hasComparison } = useFilteredData();
  const { filters } = useFilters();

  const currentLabel = formatPeriodLabel(filters.dataInicio) || 'Atual';
  const compLabel = formatPeriodLabel(filters.compDataInicio) || 'Anterior';

  // Daily data - current period
  const daily: Record<string, { date: string; faturamento: number; vendas: number; combos: number }> = {};
  filteredVendas.forEach(v => {
    const d = v.data_instalacao.slice(5);
    if (!daily[d]) daily[d] = { date: d, faturamento: 0, vendas: 0, combos: 0 };
    daily[d].faturamento += v.valor_total;
    daily[d].vendas += 1;
    if (v.e_combo) daily[d].combos += 1;
  });

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

  // Tipo de venda
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

  // Vendas por empresa
  const empresaVendas: Record<string, number> = {};
  filteredVendas.forEach(v => {
    const emp = v.empresa_venda || 'Não identificado';
    empresaVendas[emp] = (empresaVendas[emp] || 0) + 1;
  });
  const empresaData = Object.entries(empresaVendas)
    .sort((a, b) => b[1] - a[1])
    .map(([name, vendas]) => ({ name, vendas }));

  const renderDualPie = (
    title: string,
    currentData: { name: string; value: number }[],
    compData: { name: string; value: number }[],
    colorOffset: number
  ) => (
    <div className={hasComparison && compData.length > 0 ? 'grid grid-cols-2 gap-1' : ''}>
      <div>
        {hasComparison && compData.length > 0 && <p className="text-[10px] font-medium text-center text-primary mb-1">{currentLabel}</p>}
        <ResponsiveContainer width="100%" height={hasComparison && compData.length > 0 ? 200 : 240}>
          <PieChart>
            <Pie
              data={currentData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={hasComparison ? 50 : 65}
              label={renderPieLabel}
              labelLine={true}
              fontSize={9}
            >
              {currentData.map((_, i) => <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={pieTooltipStyle.contentStyle}
              itemStyle={pieTooltipStyle.itemStyle}
              formatter={(value: number, name: string) => [`${value} vendas`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {hasComparison && compData.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-center text-muted-foreground mb-1">{compLabel}</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={compData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} label={renderPieLabel} labelLine={true} fontSize={9} opacity={0.5}>
                {compData.map((_, i) => <Cell key={i} fill={COLORS_FADED[(i + colorOffset) % COLORS_FADED.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={pieTooltipStyle.contentStyle}
                itemStyle={pieTooltipStyle.itemStyle}
                formatter={(value: number, name: string) => [`${value} vendas`, name]}
              />
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
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(label) => `Dia ${label}`}
                formatter={(v: number, name: string) => [fmt(v), name === 'compFaturamento' ? compLabel : currentLabel]}
              />
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
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(label) => `Dia ${label}`}
              />
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
          {renderDualPie('Tipo de Venda', tipoVendaData, compTipoVendaData, 0)}
        </div>

        {/* Tipo de Cliente */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Tipo de Cliente</h3>
          {renderDualPie('Tipo de Cliente', tipoClienteData, compTipoClienteData, 2)}
        </div>

        {/* Forma Pagamento */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Forma de Pagamento</h3>
          {renderDualPie('Forma de Pagamento', formaPagData, compFormaPagData, 4)}
        </div>

        {/* Vendas por Empresa */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Vendas por Empresa</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={empresaData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={40} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(label) => `Empresa: ${label}`}
                formatter={(v: number) => [`${v} vendas`]}
              />
              <Bar dataKey="vendas" name="Vendas" radius={[0, 4, 4, 0]}>
                {empresaData.map((entry) => (
                  <Cell key={entry.name} fill={EMPRESA_COLORS[entry.name] || 'hsl(215,16%,47%)'} />
                ))}
                <LabelList dataKey="vendas" position="right" style={{ fontSize: 11, fontWeight: 600, fill: 'hsl(var(--foreground))' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
