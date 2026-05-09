import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '@/lib/filters-context';
import { cleanString } from '@/lib/use-filtered-data';
import { parseBindings } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search, SlidersHorizontal, ChevronDown, ChevronUp, ArrowLeftRight, Calendar, Wand2, CalendarRange } from 'lucide-react';
import { formatPeriodLabel, getDefaultComparisonDates } from '@/lib/monthly-goals';
import { MultiSelectFilter } from './MultiSelectFilter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerTrigger } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface FilterBarProps {
  compact?: boolean;
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-medium shrink-0 border border-primary/20">
      <span className="truncate max-w-[140px]">{label}</span>
      <button
        onClick={onRemove}
        className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
        aria-label={`Remover ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export function FilterBar({ compact = false }: FilterBarProps) {
  const { filters, setFilters, resetFilters, importedData, userInfo } = useFilters();
  const [expanded, setExpanded] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const showComp = !!(filters.compDataInicio && filters.compDataFim);

  const toInputDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'thisYear') => {
    const now = new Date();
    let start: Date;
    let end: Date;
    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last7':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      case 'last30':
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
    }
    setFilters(prev => ({ ...prev, dataInicio: toInputDate(start), dataFim: toInputDate(end) }));
    setPresetsOpen(false);
  };

  const toggleComp = () => {
    if (showComp) {
      // Disable comparison: clear dates (manual change so auto-fill won't restore)
      setFilters(prev => ({ ...prev, compDataInicio: '', compDataFim: '' }));
    } else {
      // Enable comparison: set defaults based on current period (same day-of-month, prev month)
      const { compDataInicio, compDataFim } = getDefaultComparisonDates(filters.dataInicio, filters.dataFim);
      setFilters(prev => ({ ...prev, compDataInicio, compDataFim }));
    }
  };

  const resetCompToAuto = () => {
    const { compDataInicio, compDataFim } = getDefaultComparisonDates(filters.dataInicio, filters.dataFim);
    setFilters(prev => ({ ...prev, compDataInicio, compDataFim }));
  };

  const autoComp = useMemo(() => getDefaultComparisonDates(filters.dataInicio, filters.dataFim), [filters.dataInicio, filters.dataFim]);
  const isCompManual = showComp && (filters.compDataInicio !== autoComp.compDataInicio || filters.compDataFim !== autoComp.compDataFim);

  const matchesOption = (selectedValue: string, ...rowValues: string[]) => {
    const selectedClean = cleanString(selectedValue);
    return rowValues.some(value => {
      const valueClean = cleanString(value);
      return valueClean === selectedClean || valueClean.includes(selectedClean) || selectedClean.includes(valueClean);
    });
  };


  // Pré-filtrar dados baseado no perfil do usuário (replicando a lógica de useFilteredData)
  const sourceVendas = useMemo(() => {
    const allVendas = importedData ? importedData.vendas : [];
    if (!userInfo) return allVendas;

    const perfil = userInfo.perfil;
    if (perfil === 'administrador') return allVendas;

    if (perfil === 'supervisor' && userInfo.nome_supervisor_vinculado) {
      const supNames = parseBindings(userInfo.nome_supervisor_vinculado).map(cleanString);
      return allVendas.filter(v => {
        const supField = cleanString(v.supervisor);
        const supNorm = cleanString(v.supervisor_normalizado);
        return supNames.some(supClean =>
          supField === supClean || supNorm === supClean
          || supField.includes(supClean) || supClean.includes(supField)
          || supNorm.includes(supClean) || supClean.includes(supNorm)
        );
      });
    }

    if ((perfil === 'vendedor' || perfil === 'consultor') && userInfo.nome_vendedor_vinculado) {
      const vendClean = cleanString(userInfo.nome_vendedor_vinculado);
      return allVendas.filter(v => {
        const vendField = cleanString(v.vendedor);
        const vendNorm = cleanString(v.vendedor_normalizado);
        return vendField === vendClean || vendNorm === vendClean
          || vendField.includes(vendClean) || vendClean.includes(vendField)
          || vendNorm.includes(vendClean) || vendClean.includes(vendNorm);
      });
    }

    return [];
  }, [importedData, userInfo]);

  const getAvailableOptions = useCallback((ignoreKey: string, extractor: (v: typeof sourceVendas[0]) => string) => {
    let list = sourceVendas;
    if (ignoreKey !== 'vendedor' && filters.vendedor.length > 0) {
      list = list.filter(v => filters.vendedor.some(f => matchesOption(f, v.vendedor, v.vendedor_normalizado)));
    }
    if (ignoreKey !== 'supervisor' && filters.supervisor.length > 0) {
      list = list.filter(v => filters.supervisor.some(f => matchesOption(f, v.supervisor, v.supervisor_normalizado)));
    }
    if (ignoreKey !== 'empresa' && filters.empresa.length > 0) {
      list = list.filter(v => filters.empresa.some(f => cleanString(f) === cleanString(String(v.empresa_venda))));
    }
    if (ignoreKey !== 'tipoVenda' && filters.tipoVenda.length > 0) {
      list = list.filter(v => filters.tipoVenda.includes(v.tipo_venda));
    }
    const set = new Set(list.map(extractor).filter(Boolean));
    return Array.from(set).sort();
  }, [sourceVendas, filters.vendedor, filters.supervisor, filters.empresa, filters.tipoVenda]);

  const vendedores = useMemo(() => getAvailableOptions('vendedor', v => v.vendedor_normalizado), [getAvailableOptions]);
  const empresas = useMemo(() => getAvailableOptions('empresa', v => String(v.empresa_venda).toUpperCase()), [getAvailableOptions]);
  const supervisores = useMemo(() => getAvailableOptions('supervisor', v => v.supervisor_normalizado), [getAvailableOptions]);
  const tiposVenda = useMemo(() => getAvailableOptions('tipoVenda', v => v.tipo_venda), [getAvailableOptions]);

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

  const updateArray = (key: string, value: string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const update = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.vendedor.length > 0 || filters.supervisor.length > 0 || filters.tipoVenda.length > 0 || filters.tipoFiltro.length > 0 || filters.empresa.length > 0 || filters.busca;

  const currentPeriodLabel = filters.dataInicio ? formatPeriodLabel(filters.dataInicio) : '';
  const compPeriodLabel = filters.compDataInicio ? formatPeriodLabel(filters.compDataInicio) : '';

  const activeCount =
    (filters.vendedor.length > 0 ? 1 : 0) +
    (filters.supervisor.length > 0 ? 1 : 0) +
    (filters.empresa.length > 0 ? 1 : 0) +
    (filters.tipoVenda.length > 0 ? 1 : 0) +
    (filters.tipoFiltro.length > 0 ? 1 : 0) +
    (filters.busca ? 1 : 0);

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 py-1 text-xs">
        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
        <Input type="date" className="h-7 w-[125px] text-xs shrink-0" value={filters.dataInicio} onChange={e => update('dataInicio', e.target.value)} />
        <span className="text-muted-foreground shrink-0">até</span>
        <Input type="date" className="h-7 w-[125px] text-xs shrink-0" value={filters.dataFim} onChange={e => update('dataFim', e.target.value)} />
        <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0">
              <CalendarRange className="h-3 w-3" /> Períodos
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('thisMonth')}>Mês atual</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('lastMonth')}>Mês anterior</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('last7')}>Últimos 7 dias</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('last30')}>Últimos 30 dias</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('thisYear')}>Ano atual</button>
          </PopoverContent>
        </Popover>
        <div className="h-4 w-px bg-border/60 mx-1 shrink-0" />
        <MultiSelectFilter label="Empresa" options={empresas} selected={filters.empresa} onChange={v => updateArray('empresa', v)} className="w-28 h-7 text-xs shrink-0" />
        <MultiSelectFilter label="Vendedor" options={vendedores} selected={filters.vendedor} onChange={v => updateArray('vendedor', v)} className="w-32 h-7 text-xs shrink-0" />
        <MultiSelectFilter label="Supervisor" options={supervisores} selected={filters.supervisor} onChange={v => updateArray('supervisor', v)} className="w-32 h-7 text-xs shrink-0" />
        <MultiSelectFilter label="Tipo Venda" options={tiposVenda} selected={filters.tipoVenda} onChange={v => updateArray('tipoVenda', v)} className="w-28 h-7 text-xs shrink-0" />
        <MultiSelectFilter label="Tipo Produto" options={tipoOptions} selected={filters.tipoFiltro} onChange={v => updateArray('tipoFiltro', v)} className="w-32 h-7 text-xs shrink-0" />
        <Button
          variant={showComp ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleComp}
          className="h-7 gap-1 text-xs shrink-0"
          title="Comparar períodos"
        >
          <ArrowLeftRight className="h-3 w-3" />
          {showComp ? 'Comparando' : 'Comparar'}
        </Button>
      </div>
    );
  }

  // ===== MOBILE LAYOUT =====
  if (isMobile) {
    return (
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-3 py-2 space-y-2">
        {/* Period chips row */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs shrink-0 rounded-full">
                <CalendarRange className="h-3.5 w-3.5" />
                <span className="font-medium">{currentPeriodLabel || 'Período'}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1">
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent" onClick={() => applyPreset('thisMonth')}>Mês atual</button>
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent" onClick={() => applyPreset('lastMonth')}>Mês anterior</button>
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent" onClick={() => applyPreset('last7')}>Últimos 7 dias</button>
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent" onClick={() => applyPreset('last30')}>Últimos 30 dias</button>
              <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent" onClick={() => applyPreset('thisYear')}>Ano atual</button>
            </PopoverContent>
          </Popover>

          <Button
            variant={showComp ? "secondary" : "outline"}
            size="sm"
            onClick={toggleComp}
            className="h-9 px-3 gap-1.5 text-xs shrink-0 rounded-full"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            {showComp ? (compPeriodLabel || 'Comparar') : 'Comparar'}
          </Button>

          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerTrigger asChild>
              <Button
                variant={activeCount > 0 ? 'default' : 'outline'}
                size="sm"
                className="h-9 px-3 gap-1.5 text-xs shrink-0 rounded-full ml-auto"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filtros
                {activeCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-primary-foreground text-primary text-[10px] font-semibold px-1 tabular-nums">
                    {activeCount}
                  </span>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[92vh]">
              <DrawerHeader className="pb-2">
                <DrawerTitle className="text-base flex items-center justify-between">
                  <span>Filtros</span>
                  {(activeCount > 0 || showComp) && (
                    <button onClick={resetFilters} className="text-xs font-normal text-muted-foreground hover:text-foreground">
                      Limpar tudo
                    </button>
                  )}
                </DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-4 space-y-4">
                {/* Período personalizado */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Período</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">De</label>
                      <Input type="date" className="h-10 text-sm" value={filters.dataInicio} onChange={e => update('dataInicio', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Até</label>
                      <Input type="date" className="h-10 text-sm" value={filters.dataFim} onChange={e => update('dataFim', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Comparação */}
                {showComp && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <ArrowLeftRight className="h-3 w-3" /> Comparar com
                      </p>
                      {isCompManual && (
                        <button onClick={resetCompToAuto} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                          <Wand2 className="h-3 w-3" /> Auto
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" className="h-10 text-sm" value={filters.compDataInicio} onChange={e => update('compDataInicio', e.target.value)} />
                      <Input type="date" className="h-10 text-sm" value={filters.compDataFim} onChange={e => update('compDataFim', e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Multi-selects */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Refinar</p>
                  <div className="grid grid-cols-2 gap-2">
                    <MultiSelectFilter label="Empresa" options={empresas} selected={filters.empresa} onChange={v => updateArray('empresa', v)} />
                    <MultiSelectFilter label="Vendedor" options={vendedores} selected={filters.vendedor} onChange={v => updateArray('vendedor', v)} />
                    <MultiSelectFilter label="Supervisor" options={supervisores} selected={filters.supervisor} onChange={v => updateArray('supervisor', v)} />
                    <MultiSelectFilter label="Tipo Venda" options={tiposVenda} selected={filters.tipoVenda} onChange={v => updateArray('tipoVenda', v)} />
                    <div className="col-span-2">
                      <MultiSelectFilter label="Tipo Produto" options={tipoOptions} selected={filters.tipoFiltro} onChange={v => updateArray('tipoFiltro', v)} />
                    </div>
                  </div>
                </div>

                {/* Busca */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Buscar</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Cliente, vendedor, contrato..." className="h-10 text-sm pl-9" value={filters.busca} onChange={e => update('busca', e.target.value)} />
                  </div>
                </div>
              </div>
              <DrawerFooter className="pt-2 border-t border-border">
                <Button onClick={() => setMobileOpen(false)} className="w-full h-11">
                  Ver resultados
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Active filter chips (quick remove) */}
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            {filters.empresa.length > 0 && (
              <ActiveChip label={`Empresa: ${filters.empresa.length}`} onRemove={() => updateArray('empresa', [])} />
            )}
            {filters.vendedor.length > 0 && (
              <ActiveChip label={`Vendedor: ${filters.vendedor.length}`} onRemove={() => updateArray('vendedor', [])} />
            )}
            {filters.supervisor.length > 0 && (
              <ActiveChip label={`Supervisor: ${filters.supervisor.length}`} onRemove={() => updateArray('supervisor', [])} />
            )}
            {filters.tipoVenda.length > 0 && (
              <ActiveChip label={`Tipo: ${filters.tipoVenda.length}`} onRemove={() => updateArray('tipoVenda', [])} />
            )}
            {filters.tipoFiltro.length > 0 && (
              <ActiveChip label={`Produto: ${filters.tipoFiltro.length}`} onRemove={() => updateArray('tipoFiltro', [])} />
            )}
            {filters.busca && (
              <ActiveChip label={`"${filters.busca}"`} onRemove={() => update('busca', '')} />
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== DESKTOP LAYOUT =====
  return (
    <div className="filter-bar space-y-2">
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

        <Popover open={presetsOpen} onOpenChange={setPresetsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2">
              <CalendarRange className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Períodos</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('thisMonth')}>Mês atual</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('lastMonth')}>Mês anterior</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('last7')}>Últimos 7 dias</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('last30')}>Últimos 30 dias</button>
            <button className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent" onClick={() => applyPreset('thisYear')}>Ano atual</button>
          </PopoverContent>
        </Popover>

        {/* Desktop filters */}
        <div className="hidden md:contents">
          <MultiSelectFilter label="Empresa" options={empresas} selected={filters.empresa} onChange={v => updateArray('empresa', v)} className="w-32" />
          <MultiSelectFilter label="Vendedor" options={vendedores} selected={filters.vendedor} onChange={v => updateArray('vendedor', v)} className="w-40" />
          <MultiSelectFilter label="Supervisor" options={supervisores} selected={filters.supervisor} onChange={v => updateArray('supervisor', v)} className="w-40" />
          <MultiSelectFilter label="Tipo Venda" options={tiposVenda} selected={filters.tipoVenda} onChange={v => updateArray('tipoVenda', v)} className="w-32" />
          <MultiSelectFilter label="Tipo Produto" options={tipoOptions} selected={filters.tipoFiltro} onChange={v => updateArray('tipoFiltro', v)} className="w-40" />
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
          onClick={toggleComp}
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
          {isCompManual && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={resetCompToAuto} title="Voltar ao período equivalente do mês anterior">
              <Wand2 className="h-3 w-3" />
              Automático (mês anterior)
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => {
            setFilters(prev => ({ ...prev, compDataInicio: '', compDataFim: '' }));
          }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {expanded && (
        <div className="grid grid-cols-2 gap-2 mt-1 md:hidden">
          <MultiSelectFilter label="Empresa" options={empresas} selected={filters.empresa} onChange={v => updateArray('empresa', v)} />
          <MultiSelectFilter label="Vendedor" options={vendedores} selected={filters.vendedor} onChange={v => updateArray('vendedor', v)} />
          <MultiSelectFilter label="Supervisor" options={supervisores} selected={filters.supervisor} onChange={v => updateArray('supervisor', v)} />
          <MultiSelectFilter label="Tipo Venda" options={tiposVenda} selected={filters.tipoVenda} onChange={v => updateArray('tipoVenda', v)} />
          <MultiSelectFilter label="Tipo Produto" options={tipoOptions} selected={filters.tipoFiltro} onChange={v => updateArray('tipoFiltro', v)} />
          <div className="relative col-span-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar..." className="h-8 text-xs pl-8" value={filters.busca} onChange={e => update('busca', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}
