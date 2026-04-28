import { useState } from 'react';
import { useFilteredData } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { Venda } from '@/lib/types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList, CartesianGrid } from 'recharts';
import { chartTooltip, titleCase } from '@/lib/chart-tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(347,77%,50%)', 'hsl(38,92%,50%)', 'hsl(160,84%,39%)', 'hsl(199,89%,48%)', 'hsl(215,16%,47%)'];
const COLORS_FADED = ['hsl(217,91%,80%)', 'hsl(271,91%,82%)', 'hsl(347,77%,75%)', 'hsl(38,92%,75%)', 'hsl(160,84%,65%)', 'hsl(199,89%,72%)', 'hsl(215,16%,72%)'];
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPRESA_COLORS: Record<string, string> = {
  'VNA': 'hsl(217,91%,60%)',
  'RDT': 'hsl(347,77%,50%)',
};


const CustomPieLegend = ({ data, colorOffset, faded, activeName, onItemClick }: { data: { name: string; value: number }[]; colorOffset: number; faded?: boolean; activeName?: string | null; onItemClick?: (name: string) => void }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const colors = faded ? COLORS_FADED : COLORS;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
      {data.map((d, i) => {
        const perc = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
        return (
          <div
            key={d.name}
            className="flex items-center gap-1.5 text-[10px] cursor-pointer transition-opacity"
            onClick={() => onItemClick && onItemClick(d.name)}
            style={{ opacity: !activeName || activeName === d.name ? 1 : 0.3 }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: colors[(i + colorOffset) % colors.length] }}
            />
            <span className="text-foreground">{d.name}</span>
            <span className="text-muted-foreground tabular-nums">{d.value} ({perc}%)</span>
          </div>
        );
      })}
    </div>
  );
};

export function TabGraficos() {
  const [activePieName, setActivePieName] = useState<string | null>(null);
  const { filteredVendas, stats, compFilteredVendas, compStats, hasComparison } = useFilteredData();
  const { filters } = useFilters();
  const isMobile = useIsMobile();
  const tooltipTrigger: 'click' | 'hover' = isMobile ? 'click' : 'hover';

  const currentLabel = formatPeriodLabel(filters.dataInicio) || 'Atual';
  const compLabel = formatPeriodLabel(filters.compDataInicio) || 'Anterior';

  // Daily data - use day index (1,2,3...) so lines overlap properly
  const dailyByIndex = (vendas: Venda[]) => {
    const byDate: Record<string, { faturamento: number; vendas: number; combos: number }> = {};
    vendas.forEach(v => {
      const d = v.data_instalacao;
      if (!byDate[d]) byDate[d] = { faturamento: 0, vendas: 0, combos: 0 };
      byDate[d].faturamento += v.valor_total;
      byDate[d].vendas += 1;
      if (v.e_combo) byDate[d].combos += 1;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, data], idx) => ({
      idx: idx + 1,
      date: `${date.slice(8)}/${date.slice(5, 7)}`,
      ...data,
    }));
  };

  const currentDaily = dailyByIndex(filteredVendas);
  const compDailyRaw = hasComparison ? dailyByIndex(compFilteredVendas) : [];

  // Merge by index for overlapping
  const maxLen = Math.max(currentDaily.length, compDailyRaw.length);
  const dailyData = Array.from({ length: maxLen }, (_, i) => ({
    idx: i + 1,
    date: currentDaily[i]?.date || compDailyRaw[i]?.date || '',
    faturamento: currentDaily[i]?.faturamento || 0,
    vendas: currentDaily[i]?.vendas || 0,
    combos: currentDaily[i]?.combos || 0,
    compFaturamento: compDailyRaw[i]?.faturamento || 0,
    compVendas: compDailyRaw[i]?.vendas || 0,
    compCombos: compDailyRaw[i]?.combos || 0,
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

  // Vendas por empresa - now with faturamento + comparison
  const empresaVendas: Record<string, { vendas: number; faturamento: number }> = {};
  filteredVendas.forEach(v => {
    const emp = v.empresa_venda || 'Não identificado';
    if (!empresaVendas[emp]) empresaVendas[emp] = { vendas: 0, faturamento: 0 };
    empresaVendas[emp].vendas += 1;
    empresaVendas[emp].faturamento += v.valor_total;
  });

  const compEmpresaVendas: Record<string, { vendas: number; faturamento: number }> = {};
  if (hasComparison) {
    compFilteredVendas.forEach(v => {
      const emp = v.empresa_venda || 'Não identificado';
      if (!compEmpresaVendas[emp]) compEmpresaVendas[emp] = { vendas: 0, faturamento: 0 };
      compEmpresaVendas[emp].vendas += 1;
      compEmpresaVendas[emp].faturamento += v.valor_total;
    });
  }

  const allEmpresaKeys = [...new Set([...Object.keys(empresaVendas), ...Object.keys(compEmpresaVendas)])];
  const empresaData = allEmpresaKeys
    .map(name => ({
      name,
      vendas: empresaVendas[name]?.vendas || 0,
      faturamento: empresaVendas[name]?.faturamento || 0,
      compVendas: compEmpresaVendas[name]?.vendas || 0,
      compFaturamento: compEmpresaVendas[name]?.faturamento || 0,
    }))
    .sort((a, b) => b.vendas - a.vendas);

  const renderDualPie = (
    title: string,
    currentData: { name: string; value: number }[],
    compData: { name: string; value: number }[],
    colorOffset: number
  ) => (
    <div>
      <div className={hasComparison && compData.length > 0 ? 'grid grid-cols-2 gap-1 min-w-0' : ''}>
        <div className="min-w-0">
          {hasComparison && compData.length > 0 && <p className="text-[10px] font-medium text-center text-primary mb-1">{currentLabel}</p>}
          <ResponsiveContainer width="100%" height={hasComparison && compData.length > 0 ? 180 : 200}>
            <PieChart>
              <Pie
                data={currentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={hasComparison ? '76%' : '78%'}
                innerRadius={hasComparison ? '42%' : '46%'}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={3}
                onClick={(data) => setActivePieName(prev => prev === data.name ? null : data.name)}
              >
                {currentData.map((d, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[(i + colorOffset) % COLORS.length]}
                    style={{ outline: 'none', cursor: 'pointer' }}
                    opacity={!activePieName || activePieName === d.name ? 1 : 0.3}
                  />
                ))}
              </Pie>
                <Tooltip
                trigger={tooltipTrigger}
                contentStyle={chartTooltip.contentStyle}
                itemStyle={chartTooltip.itemStyle}
                labelStyle={chartTooltip.labelStyle}
                formatter={(value: number, name: string) => [`${value} vendas`, titleCase(name)]}
              />
            </PieChart>
          </ResponsiveContainer>
          <CustomPieLegend
            data={currentData}
            colorOffset={colorOffset}
            activeName={activePieName}
            onItemClick={(n) => setActivePieName(prev => prev === n ? null : n)}
          />
        </div>
        {hasComparison && compData.length > 0 && (
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-center text-muted-foreground mb-1">{compLabel}</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={compData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius="76%"
                  innerRadius="42%"
                  paddingAngle={3}
                  stroke="#ffffff"
                  strokeWidth={3}
                  onClick={(data) => setActivePieName(prev => prev === data.name ? null : data.name)}
                >
                  {compData.map((d, i) => (
                    <Cell
                      key={i}
                      fill={COLORS_FADED[(i + colorOffset) % COLORS_FADED.length]}
                      style={{ outline: 'none', cursor: 'pointer' }}
                      opacity={!activePieName || activePieName === d.name ? 0.6 : 0.2}
                    />
                  ))}
                </Pie>
                <Tooltip
                trigger={tooltipTrigger}
                contentStyle={chartTooltip.contentStyle}
                itemStyle={chartTooltip.itemStyle}
                labelStyle={chartTooltip.labelStyle}
                formatter={(value: number, name: string) => [`${value} vendas`, titleCase(name)]}
              />
              </PieChart>
            </ResponsiveContainer>
            <CustomPieLegend
              data={compData}
              colorOffset={colorOffset}
              faded
              activeName={activePieName}
              onItemClick={(n) => setActivePieName(prev => prev === n ? null : n)}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Gráficos</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">Visualizações interativas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {/* Evolução Diária — Vendas e Faturamento (unificado) */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Evolução Diária — Vendas e Faturamento</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={dailyData} margin={{ top: 8, right: 8, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} interval="preserveStartEnd" />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={30}
                label={{ value: 'Vendas', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                width={38}
                label={{ value: 'Faturamento', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 9, fill: 'hsl(var(--muted-foreground))' } }}
              />
              <Tooltip
                trigger={tooltipTrigger}
                {...chartTooltip}
                labelFormatter={(label) => label}
                formatter={(v: number, name: string) => {
                  if (name.toLowerCase().includes('faturamento') || name === compLabel) return [fmt(v), titleCase(name)];
                  return [`${v} vendas`, titleCase(name)];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {/* Vendas — eixo esquerdo */}
              <Line yAxisId="left" type="monotone" dataKey="vendas" name={`Vendas (${currentLabel})`} stroke="hsl(347,77%,50%)" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff', stroke: 'hsl(347,77%,50%)', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ffffff', stroke: 'hsl(347,77%,50%)', strokeWidth: 2.5 }} />
              {hasComparison && (
                <Line yAxisId="left" type="monotone" dataKey="compVendas" name={`Vendas (${compLabel})`} stroke="hsl(347,77%,75%)" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: '#ffffff', stroke: 'hsl(347,77%,75%)', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
              )}
              {/* Faturamento — eixo direito */}
              <Line yAxisId="right" type="monotone" dataKey="faturamento" name={`Faturamento (${currentLabel})`} stroke="hsl(160,84%,39%)" strokeWidth={2.5} dot={{ r: 4, fill: '#ffffff', stroke: 'hsl(160,84%,39%)', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#ffffff', stroke: 'hsl(160,84%,39%)', strokeWidth: 2.5 }} />
              {hasComparison && (
                <Line yAxisId="right" type="monotone" dataKey="compFaturamento" name={`Faturamento (${compLabel})`} stroke="hsl(160,84%,65%)" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3, fill: '#ffffff', stroke: 'hsl(160,84%,65%)', strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tipo de Venda */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Tipo de Venda</h3>
          {renderDualPie('Tipo de Venda', tipoVendaData, compTipoVendaData, 0)}
        </div>

        {/* Tipo de Cliente */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Tipo de Cliente</h3>
          {renderDualPie('Tipo de Cliente', tipoClienteData, compTipoClienteData, 2)}
        </div>

        {/* Forma Pagamento */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Forma de Pagamento</h3>
          {renderDualPie('Forma de Pagamento', formaPagData, compFormaPagData, 4)}
        </div>

        {/* Vendas por Empresa */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5 min-w-0 overflow-hidden">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Vendas por Empresa</h3>
          <ResponsiveContainer width="100%" height={Math.max(180, empresaData.length * 60)}>
            <BarChart data={empresaData} layout="vertical" margin={{ top: 5, right: isMobile ? 50 : 90, left: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={48} />
              <Tooltip
                trigger={tooltipTrigger}
                {...chartTooltip}
                labelFormatter={(label) => `Empresa: ${titleCase(label)}`}
                formatter={(v: number, name: string) => {
                  if (name === 'compVendas') return [`${v} vendas`, compLabel];
                  if (name === 'vendas') return [`${v} vendas`, currentLabel];
                  return [fmt(v), titleCase(name)];
                }}
              />
              {hasComparison && (
                <Bar dataKey="compVendas" name="compVendas" radius={[0, 4, 4, 0]} opacity={0.3} stroke="#ffffff" strokeWidth={2}>
                  {empresaData.map((entry) => (
                    <Cell key={`comp-${entry.name}`} fill={EMPRESA_COLORS[entry.name] || 'hsl(215,16%,47%)'} />
                  ))}
                </Bar>
              )}
              <Bar dataKey="vendas" name="vendas" radius={[0, 4, 4, 0]} stroke="#ffffff" strokeWidth={2}>
                {empresaData.map((entry) => (
                  <Cell key={entry.name} fill={EMPRESA_COLORS[entry.name] || 'hsl(215,16%,47%)'} />
                ))}
                <LabelList
                  dataKey="vendas"
                  position="right"
                  style={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                  formatter={(v: number) => isMobile ? `${v}` : `${v} vendas`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Faturamento labels below */}
          <div className="flex flex-wrap gap-4 mt-2 justify-center">
            {empresaData.map(e => (
              <div key={e.name} className="text-center">
                <p className="text-[10px] text-muted-foreground">{e.name}</p>
                <p className="text-xs font-bold" style={{ color: EMPRESA_COLORS[e.name] || 'hsl(215,16%,47%)' }}>{fmt(e.faturamento)}</p>
                {hasComparison && e.compFaturamento > 0 && (
                  <p className="text-[10px] text-muted-foreground">Ant: {fmt(e.compFaturamento)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
