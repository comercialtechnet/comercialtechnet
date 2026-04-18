import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFilters } from '@/lib/filters-context';
import { cleanString } from '@/lib/use-filtered-data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Search, SlidersHorizontal, ChevronDown, ChevronUp, ArrowLeftRight, Calendar } from 'lucide-react';
import { formatPeriodLabel } from '@/lib/monthly-goals';
import { MultiSelectFilter } from './MultiSelectFilter';

export function FilterBar() {
  const { filters, setFilters, resetFilters, importedData, userInfo } = useFilters();
  const [expanded, setExpanded] = useState(false);
  const [showComp, setShowComp] = useState(false);


  // Pré-filtrar dados baseado no perfil do usuário (replicando a lógica de useFilteredData)
  const sourceVendas = useMemo(() => {
    const allVendas = importedData ? importedData.vendas : [];
    if (!userInfo) return allVendas;

    const perfil = userInfo.perfil;
    if (perfil === 'administrador') return allVendas;

    if (perfil === 'supervisor' && userInfo.nome_supervisor_vinculado) {
      const supClean = cleanString(userInfo.nome_supervisor_vinculado);
      return allVendas.filter(v => {
        const supField = cleanString(v.supervisor);
        const supNorm = cleanString(v.supervisor_normalizado);
        return supField === supClean || supNorm === supClean
          || supField.includes(supClean) || supClean.includes(supField)
          || supNorm.includes(supClean) || supClean.includes(supNorm);
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
      list = list.filter(v => filters.vendedor.some(f => cleanString(f) === cleanString(v.vendedor_normalizado)));
    }
    if (ignoreKey !== 'supervisor' && filters.supervisor.length > 0) {
      list = list.filter(v => filters.supervisor.some(f => cleanString(f) === cleanString(v.supervisor_normalizado)));
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

  useEffect(() => {
    if (filters.compDataInicio || filters.compDataFim) {
      setShowComp(true);
    }
  }, [filters.compDataInicio, filters.compDataFim]);

  const updateArray = (key: string, value: string[]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const update = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const hasActiveFilters = filters.vendedor.length > 0 || filters.supervisor.length > 0 || filters.tipoVenda.length > 0 || filters.tipoFiltro.length > 0 || filters.empresa.length > 0 || filters.busca;

  const currentPeriodLabel = filters.dataInicio ? formatPeriodLabel(filters.dataInicio) : '';
  const compPeriodLabel = filters.compDataInicio ? formatPeriodLabel(filters.compDataInicio) : '';

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
