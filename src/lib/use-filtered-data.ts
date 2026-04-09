import { useMemo } from 'react';
import { mockVendas, mockItens } from './mock-data';
import { useFilters } from './filters-context';
import { Venda, ItemVenda, DashboardStats, DashboardFilters } from './types';

function applyTipoFilter(v: Venda, tipoFiltro: string): boolean {
  if (!tipoFiltro) return true;
  switch (tipoFiltro) {
    case 'Internet': return v.possui_internet;
    case 'TV': return v.possui_tv;
    case 'Móvel': return v.possui_movel;
    case 'Telefone': return v.possui_telefone;
    case 'WiFi Mesh': return v.possui_mesh;
    case 'Ponto Extra': return v.possui_ponto_extra;
    case 'Mudança de Tecnologia': return v.possui_mudanca_tecnologia;
    case 'Combo': return v.e_combo;
    case 'Single': return !v.e_combo;
    default: return true;
  }
}

function filterVendas(
  vendas: Venda[],
  itens: ItemVenda[],
  filters: DashboardFilters,
  dateOverride?: { dataInicio: string; dataFim: string }
): Venda[] {
  const dInicio = dateOverride?.dataInicio ?? filters.dataInicio;
  const dFim = dateOverride?.dataFim ?? filters.dataFim;

  return vendas.filter((v: Venda) => {
    if (dInicio && v.data_instalacao < dInicio) return false;
    if (dFim && v.data_instalacao > dFim) return false;
    if (filters.vendedor && v.vendedor_normalizado !== filters.vendedor.toUpperCase()) return false;
    if (filters.supervisor && v.supervisor_normalizado !== filters.supervisor.toUpperCase()) return false;
    if (filters.categoriaPrincipal) {
      const vendaItens = itens.filter(it => it.venda_id === v.id_venda);
      if (!vendaItens.some(it => it.categoria_principal === filters.categoriaPrincipal)) return false;
    }
    if (filters.tipoVenda && v.tipo_venda !== filters.tipoVenda) return false;
    if (filters.tipoCliente && v.tipo_cliente !== filters.tipoCliente) return false;
    if (filters.formaPagamento && v.forma_pagamento !== filters.formaPagamento) return false;
    if (!applyTipoFilter(v, filters.tipoFiltro)) return false;
    if (filters.busca) {
      const s = filters.busca.toLowerCase();
      const match = v.cliente.toLowerCase().includes(s) ||
        v.vendedor.toLowerCase().includes(s) ||
        v.id_venda.toLowerCase().includes(s) ||
        v.proposta.toLowerCase().includes(s) ||
        v.contrato.toLowerCase().includes(s);
      if (!match) return false;
    }
    return true;
  });
}

function computeStats(vendas: Venda[], itens: ItemVenda[]): DashboardStats {
  const vendaIds = new Set(vendas.map(v => v.id_venda));
  const filteredItens = itens.filter(it => vendaIds.has(it.venda_id));

  const faturamento = vendas.reduce((sum, v) => sum + v.valor_total, 0);
  const totalVendas = vendas.length;
  const totalProdutos = filteredItens.length;
  const totalCombos = vendas.filter(v => v.e_combo).length;
  const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;
  const mediaProdutos = totalVendas > 0 ? totalProdutos / totalVendas : 0;
  const percCombos = totalVendas > 0 ? (totalCombos / totalVendas) * 100 : 0;
  const vendedoresAtivos = new Set(vendas.map(v => v.vendedor_normalizado)).size;
  const supervisoresAtivos = new Set(vendas.map(v => v.supervisor_normalizado)).size;
  const vendasInternet = vendas.filter(v => v.possui_internet).length;

  const porCategoria: Record<string, { faturamento: number; quantidade: number }> = {};
  filteredItens.forEach(it => {
    if (!porCategoria[it.categoria_principal]) porCategoria[it.categoria_principal] = { faturamento: 0, quantidade: 0 };
    porCategoria[it.categoria_principal].faturamento += it.valor_item;
    porCategoria[it.categoria_principal].quantidade += 1;
  });

  const porVendedor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number }> = {};
  vendas.forEach(v => {
    if (!porVendedor[v.vendedor]) porVendedor[v.vendedor] = { faturamento: 0, vendas: 0, produtos: 0, combos: 0 };
    porVendedor[v.vendedor].faturamento += v.valor_total;
    porVendedor[v.vendedor].vendas += 1;
    porVendedor[v.vendedor].produtos += v.quantidade_itens;
    if (v.e_combo) porVendedor[v.vendedor].combos += 1;
  });

  const porSupervisor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number; vendedores: Set<string> }> = {};
  vendas.forEach(v => {
    if (!porSupervisor[v.supervisor]) porSupervisor[v.supervisor] = { faturamento: 0, vendas: 0, produtos: 0, combos: 0, vendedores: new Set() };
    porSupervisor[v.supervisor].faturamento += v.valor_total;
    porSupervisor[v.supervisor].vendas += 1;
    porSupervisor[v.supervisor].produtos += v.quantidade_itens;
    if (v.e_combo) porSupervisor[v.supervisor].combos += 1;
    porSupervisor[v.supervisor].vendedores.add(v.vendedor);
  });

  const porComboTipo: Record<string, number> = {};
  vendas.forEach(v => {
    porComboTipo[v.combo_tipo] = (porComboTipo[v.combo_tipo] || 0) + 1;
  });

  return {
    faturamento, totalVendas, totalProdutos, totalCombos,
    ticketMedio, mediaProdutos, percCombos,
    vendedoresAtivos, supervisoresAtivos, vendasInternet,
    porCategoria, porVendedor, porSupervisor, porComboTipo,
  };
}

export function calcVariation(current: number, previous: number): number | undefined {
  if (previous === 0) return current === 0 ? 0 : undefined;
  return ((current - previous) / previous) * 100;
}

export function useFilteredData() {
  const { filters, importedData } = useFilters();

  const sourceVendas = importedData ? importedData.vendas : mockVendas;
  const sourceItens = importedData ? importedData.itens : mockItens;

  const filteredVendas = useMemo(() => {
    return filterVendas(sourceVendas, sourceItens, filters);
  }, [filters, sourceVendas, sourceItens]);

  const filteredItens = useMemo(() => {
    const vendaIds = new Set(filteredVendas.map(v => v.id_venda));
    return sourceItens.filter(it => vendaIds.has(it.venda_id));
  }, [filteredVendas, sourceItens]);

  const stats = useMemo(() => {
    return computeStats(filteredVendas, sourceItens);
  }, [filteredVendas, sourceItens]);

  // Comparison period
  const hasComparison = !!(filters.compDataInicio && filters.compDataFim);

  const compFilteredVendas = useMemo(() => {
    if (!hasComparison) return [];
    return filterVendas(sourceVendas, sourceItens, filters, {
      dataInicio: filters.compDataInicio,
      dataFim: filters.compDataFim,
    });
  }, [filters, sourceVendas, sourceItens, hasComparison]);

  const compStats = useMemo<DashboardStats | null>(() => {
    if (!hasComparison || compFilteredVendas.length === 0) return null;
    return computeStats(compFilteredVendas, sourceItens);
  }, [compFilteredVendas, sourceItens, hasComparison]);

  return { filteredVendas, filteredItens, stats, compStats, compFilteredVendas, hasComparison };
}
