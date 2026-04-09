import { useState, useMemo, useEffect } from 'react';
import { useFilters } from '@/lib/filters-context';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Search, SlidersHorizontal, ChevronDown, ChevronUp, ArrowLeftRight, Calendar } from 'lucide-react';
import { mockVendas } from '@/lib/mock-data';
import { formatPeriodLabel } from '@/lib/monthly-goals';

export function FilterBar() {
  const { filters, setFilters, resetFilters, importedData } = useFilters();
  const [expanded, setExpanded] = useState(false);
  const [showComp, setShowComp] = useState(false);

  const sourceVendas = importedData ? importedData.vendas : mockVendas;

  const vendedores = useMemo(() => {
    const set = new Set(sourceVendas.map(v => v.vendedor));
    return Array.from(set).sort();
  }, [sourceVendas]);

  const supervisores = useMemo(() => {
    const set = new Set(sourceVendas.map(v => v.supervisor));
    return Array.from(set).sort();
  }, [sourceVendas]);

  const tiposVenda = useMemo(() => {
    const set = new Set(sourceVendas.map(v => v.tipo_venda).filter(Boolean));
    return Array.from(set).sort();
  }, [sourceVendas]);

  const tipoOptions = useMemo(() => {
    const opts: string[] = [];
    if (sourceVendas.some(v => v.possui_internet)) opts.push('Internet');
    if (sourceVendas.some(v => v.possui_tv)) opts.push('TV');
    if (sourceVendas.some(v => v.possui_movel)) opts.push('Móvel');
    if (sourceVendas.some(v => v.possui_telefone)) opts.push('Telefone');
    if (sourceVendas.some(v => v.possui_mesh)) opts.push('WiFi Mesh');
    if (sourceVendas.some(v => v.possui_ponto_extra)) opts.push('Ponto Extra');
    if (sourceVendas.some(v => v.possui_mudanca_tecnologia)) opts.push('Mudança de Tecnologia');
    if (sourceVendas.some(v => v.e_combo)) opts.push('Combo');
    if (sourceVendas.some(v => !v.e_combo)) opts.push('Single');
    return opts;
  }, [sourceVendas]);

  // Auto-show comparison section if comparison dates are set
  useEffect(() => {
    if (filters.compDataInicio || filters.compDataFim) {
      setShowComp(true);
    }
  }, [filters.compDataInicio, filters.compDataFim]);

  const update = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.vendedor || filters.supervisor || filters.tipoVenda || filters.tipoFiltro || filters.busca;

  const currentPeriodLabel = filters.dataInicio ? formatPeriodLabel(filters.dataInicio) : '';
  const compPeriodLabel = filters.compDataInicio ? formatPeriodLabel(filters.compDataInicio) : '';

  const renderSelect = (value: string, key: string, placeholder: string, options: { value: string; label: string }[], allLabel: string, className?: string) => (
    <Select value={value || 'all'} onValueChange={v => update(key, v === 'all' ? '' : v)}>
      <SelectTrigger className={`h-8 text-xs ${className || ''}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const vendedorOpts = vendedores.map(v => ({ value: v, label: v }));
  const supervisorOpts = supervisores.map(v => ({ value: v, label: v }));
  const tipoVendaOpts = tiposVenda.map(v => ({ value: v, label: v }));
  const tipoFiltroOpts = tipoOptions.map(v => ({ value: v, label: v }));

  return (
    <div className="filter-bar space-y-2">
      {/* Period labels */}
      {(currentPeriodLabel || compPeriodLabel) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {currentPeriodLabel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              <Calendar className="h-3 w-3" />
              Período: {currentPeriodLabel}
            </span>
          )}
          {compPeriodLabel && showComp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              <ArrowLeftRight className="h-3 w-3" />
              Comparado com: {compPeriodLabel}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" className="h-8 w-[130px] sm:w-36 text-xs" value={filters.dataInicio} onChange={e => update('dataInicio', e.target.value)} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" className="h-8 w-[130px] sm:w-36 text-xs" value={filters.dataFim} onChange={e => update('dataFim', e.target.value)} />
        </div>

        {/* Desktop filters */}
        <div className="hidden md:contents">
          {renderSelect(filters.vendedor, 'vendedor', 'Vendedor', vendedorOpts, 'Todos vendedores', 'w-40')}
          {renderSelect(filters.supervisor, 'supervisor', 'Supervisor', supervisorOpts, 'Todos supervisores', 'w-40')}
          {renderSelect(filters.tipoVenda, 'tipoVenda', 'Tipo Venda', tipoVendaOpts, 'Todos tipos venda', 'w-32')}
          {renderSelect(filters.tipoFiltro, 'tipoFiltro', 'Tipo Produto', tipoFiltroOpts, 'Todos produtos', 'w-40')}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." className="h-8 w-48 text-xs pl-8" value={filters.busca} onChange={e => update('busca', e.target.value)} />
          </div>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-1 md:hidden ml-auto">
          <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)} className="h-8 gap-1 text-xs">
            <SlidersHorizontal className="h-3 w-3" />
            Filtros
            {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>

        <Button
          variant={showComp ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowComp(!showComp)}
          className="h-8 gap-1 text-xs"
        >
          <ArrowLeftRight className="h-3 w-3" />
          <span className="hidden sm:inline">Comparar</span>
        </Button>

        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1 text-xs text-muted-foreground">
          <X className="h-3 w-3" /> Limpar
        </Button>
      </div>

      {/* Comparison period */}
      {showComp && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
          <span className="text-xs text-muted-foreground font-medium">Comparar com:</span>
          <Input type="date" className="h-7 w-[130px] sm:w-36 text-xs" value={filters.compDataInicio} onChange={e => update('compDataInicio', e.target.value)} />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" className="h-7 w-[130px] sm:w-36 text-xs" value={filters.compDataFim} onChange={e => update('compDataFim', e.target.value)} />
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => {
            setFilters(prev => ({ ...prev, compDataInicio: '', compDataFim: '' }));
            setShowComp(false);
          }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Mobile expanded */}
      {expanded && (
        <div className="grid grid-cols-2 gap-2 mt-1 md:hidden">
          {renderSelect(filters.vendedor, 'vendedor', 'Vendedor', vendedorOpts, 'Todos vendedores')}
          {renderSelect(filters.supervisor, 'supervisor', 'Supervisor', supervisorOpts, 'Todos supervisores')}
          {renderSelect(filters.tipoVenda, 'tipoVenda', 'Tipo Venda', tipoVendaOpts, 'Todos tipos venda')}
          {renderSelect(filters.tipoFiltro, 'tipoFiltro', 'Tipo Produto', tipoFiltroOpts, 'Todos produtos')}
          <div className="relative col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." className="h-8 text-xs pl-8" value={filters.busca} onChange={e => update('busca', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
