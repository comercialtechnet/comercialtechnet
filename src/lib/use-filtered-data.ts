import { useMemo } from 'react';
import { useFilters } from './filters-context';
import { Venda, ItemVenda, DashboardStats, DashboardFilters } from './types';


function normalizeItem(it: ItemVenda): ItemVenda {
  const descricao = (it.descricao_normalizada || it.descricao_original || '').toUpperCase();

  if (it.categoria_principal === 'Adicionais' && /SOUND/.test(descricao)) {
    return {
      ...it,
      categoria_principal: 'TV',
      subcategoria: it.subcategoria === 'Geral' ? 'Soundbox' : it.subcategoria,
    };
  }

  return it;
}

function applyTipoFilter(v: Venda, tipoFiltro: string[]): boolean {
  if (!tipoFiltro || tipoFiltro.length === 0) return true;
  return tipoFiltro.some(filtro => {
    switch (filtro) {
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
  });
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
    if (filters.vendedor.length > 0 && !filters.vendedor.some(f => f.toUpperCase() === v.vendedor_normalizado)) return false;
    if (filters.supervisor.length > 0 && !filters.supervisor.some(f => f.toUpperCase() === v.supervisor_normalizado)) return false;
    if (filters.empresa.length > 0 && !filters.empresa.includes(v.empresa_venda)) return false;
    if (filters.categoriaPrincipal) {
      // Use venda UUID (id) for matching itens
      const vendaItens = itens.filter(it => it.venda_id === v.id);
      if (!vendaItens.some(it => it.categoria_principal === filters.categoriaPrincipal)) return false;
    }
    if (filters.tipoVenda.length > 0 && !filters.tipoVenda.includes(v.tipo_venda)) return false;
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
  const vendaIds = new Set(vendas.map(v => v.id));
  const filteredItens = itens.filter(it => vendaIds.has(it.venda_id));

  const faturamento = vendas.reduce((sum, v) => sum + v.valor_total, 0);
  const totalVendas = vendas.length;
  const totalProdutos = filteredItens.length;
  const totalDebitoConta = vendas.filter((v) => /(?:d[ée]bito|dcc)/i.test(v.forma_pagamento)).length;
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

  const porVendedor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number; vendasInternet: number }> = {};
  vendas.forEach(v => {
    if (!porVendedor[v.vendedor]) porVendedor[v.vendedor] = { faturamento: 0, vendas: 0, produtos: 0, combos: 0, vendasInternet: 0 };
    porVendedor[v.vendedor].faturamento += v.valor_total;
    porVendedor[v.vendedor].vendas += 1;
    porVendedor[v.vendedor].produtos += v.quantidade_itens;
    if (v.e_combo) porVendedor[v.vendedor].combos += 1;
    if (v.possui_internet) porVendedor[v.vendedor].vendasInternet += 1;
  });

  const porSupervisor: Record<string, { faturamento: number; vendas: number; produtos: number; combos: number; vendasInternet: number; vendedores: Set<string> }> = {}; vendas.forEach(v => {
    if (!porSupervisor[v.supervisor]) porSupervisor[v.supervisor] = { faturamento: 0, vendas: 0, produtos: 0, combos: 0, vendasInternet: 0, vendedores: new Set() }; porSupervisor[v.supervisor].faturamento += v.valor_total;
    porSupervisor[v.supervisor].vendas += 1;
    porSupervisor[v.supervisor].produtos += v.quantidade_itens;
    if (v.e_combo) porSupervisor[v.supervisor].combos += 1;
    if (v.possui_internet) porSupervisor[v.supervisor].vendasInternet += 1;
    porSupervisor[v.supervisor].vendedores.add(v.vendedor);
  });

  const porComboTipo: Record<string, number> = {};
  vendas.forEach(v => {
    porComboTipo[v.combo_tipo] = (porComboTipo[v.combo_tipo] || 0) + 1;
  });

  return {
    faturamento, totalVendas, totalProdutos, totalDebitoConta, totalCombos,
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
  const { filters, importedData, userInfo } = useFilters();

  // Pré-filtrar dados baseado no perfil do usuário
  const sourceVendas = useMemo(() => {
    const allVendas = importedData ? importedData.vendas : [];
    if (!userInfo) return allVendas;

    const perfil = userInfo.perfil;

    // Administradores veem tudo
    if (perfil === 'administrador') return allVendas;

    // Supervisores veem apenas vendas da sua equipe
    if (perfil === 'supervisor' && userInfo.nome_supervisor_vinculado) {
      return allVendas.filter(v => v.supervisor === userInfo.nome_supervisor_vinculado);
    }

    // Vendedores/Consultores veem apenas suas próprias vendas
    if ((perfil === 'vendedor' || perfil === 'consultor') && userInfo.nome_vendedor_vinculado) {
      return allVendas.filter(v => v.vendedor === userInfo.nome_vendedor_vinculado);
    }

    // Se não tem vínculo, não mostra nada
    return [];
  }, [importedData, userInfo]);

  const sourceItens = useMemo(() => (importedData ? importedData.itens : []).map(normalizeItem), [importedData]);

  const filteredVendas = useMemo(() => {
    return filterVendas(sourceVendas, sourceItens, filters);
  }, [filters, sourceVendas, sourceItens]);

  const filteredItens = useMemo(() => {
    const vendaIds = new Set(filteredVendas.map(v => v.id));
    return sourceItens.filter(it => vendaIds.has(it.venda_id));
  }, [filteredVendas, sourceItens]);

  const stats = useMemo(() => {
    return computeStats(filteredVendas, sourceItens);
  }, [filteredVendas, sourceItens]);

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
