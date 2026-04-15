import { useState } from 'react';
import { useFilteredData } from '@/lib/use-filtered-data';
import { useFilters } from '@/lib/filters-context';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { Venda } from '@/lib/types';
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
      date: date.slice(5),
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
      <div className={hasComparison && compData.length > 0 ? 'grid grid-cols-2 gap-1' : ''}>
        <div>
          {hasComparison && compData.length > 0 && <p className="text-[10px] font-medium text-center text-primary mb-1">{currentLabel}</p>}
          <ResponsiveContainer width="100%" height={hasComparison && compData.length > 0 ? 180 : 200}>
            <PieChart>
              <Pie
                data={currentData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={hasComparison ? 55 : 70}
                innerRadius={hasComparison ? 25 : 30}
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
                contentStyle={pieTooltipStyle.contentStyle}
                itemStyle={pieTooltipStyle.itemStyle}
                formatter={(value: number, name: string) => [`${value} vendas`, name]}
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
          <div>
            <p className="text-[10px] font-medium text-center text-muted-foreground mb-1">{compLabel}</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={compData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={55}
                  innerRadius={25}
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
                  contentStyle={pieTooltipStyle.contentStyle}
                  itemStyle={pieTooltipStyle.itemStyle}
                  formatter={(value: number, name: string) => [`${value} vendas`, name]}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Evolução Faturamento */}
        <div className="bg-card rounded-lg border border-border p-3 sm:p-5">
          <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-4">Evolução Diária — Faturamento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} width={40} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(label) => `Dia ${label}`}
                formatter={(v: number, name: string) => [fmt(v), name]}
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
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData} margin={{ top: 10, right: 15, left: 0, bottom: 5 }}>
              <XAxis dataKey="idx" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
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
          <ResponsiveContainer width="100%" height={Math.max(180, empresaData.length * 60)}>
            <BarChart data={empresaData} layout="vertical" margin={{ top: 5, right: 90, left: 5, bottom: 5 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} width={50} />
              <Tooltip
                {...tooltipStyle}
                labelFormatter={(label) => `Empresa: ${label}`}
                formatter={(v: number, name: string) => {
                  if (name === 'compVendas') return [`${v} vendas`, compLabel];
                  if (name === 'vendas') return [`${v} vendas`, currentLabel];
                  return [fmt(v), name];
                }}
              />
              {hasComparison && (
                <Bar dataKey="compVendas" name="compVendas" radius={[0, 4, 4, 0]} opacity={0.3}>
                  {empresaData.map((entry) => (
                    <Cell key={`comp-${entry.name}`} fill={EMPRESA_COLORS[entry.name] || 'hsl(215,16%,47%)'} />
                  ))}
                </Bar>
              )}
              <Bar dataKey="vendas" name="vendas" radius={[0, 4, 4, 0]}>
                {empresaData.map((entry) => (
                  <Cell key={entry.name} fill={EMPRESA_COLORS[entry.name] || 'hsl(215,16%,47%)'} />
                ))}
                <LabelList
                  dataKey="vendas"
                  position="right"
                  style={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                  formatter={(v: number) => `${v} vendas`}
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
