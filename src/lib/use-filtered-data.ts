import { useMemo } from 'react';
import { useFilters } from './filters-context';
import { Venda, ItemVenda, DashboardStats, DashboardFilters } from './types';


export function cleanString(s: string): string {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
}

export function toDateKey(raw: string | number | Date | null | undefined): number | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return raw.getFullYear() * 10000 + (raw.getMonth() + 1) * 100 + raw.getDate();
  }

  if (typeof raw === 'number') {
    // Excel serial date (day 1 = 1900-01-01 with leap bug correction)
    if (raw > 0 && raw < 100000) {
      const base = Date.UTC(1899, 11, 30);
      const ms = base + Math.floor(raw) * 86400000;
      const d = new Date(ms);
      return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    }
    return null;
  }

function toDateKey(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  // YYYY-MM-DD / YYYY-M-D / YYYY-MM-DDTHH:mm:ss...
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return y * 10000 + m * 100 + d;
    }
  }

  // DD/MM/YYYY
  const br = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const d = Number(br[1]);
    const m = Number(br[2]);
    const y = Number(br[3]);
    if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return y * 10000 + m * 100 + d;
    }
  }

  // Fallback para strings parseáveis pelo JS (ex.: "2026-04-18 00:00:00")
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear() * 10000 + (parsed.getMonth() + 1) * 100 + parsed.getDate();
  }

  return null;
}

function normalizeItem(it: ItemVenda): ItemVenda {
  const descricao = (it.descricao_normalizada || it.descricao_original || '').toUpperCase();
  const categoria = (it.categoria_principal || '').trim().toUpperCase();

  if (categoria === 'ADICIONAIS' && /SOUND|SOUND\s*BOX|SOUNDBOX/.test(descricao)) {
    return {
      ...it,
      categoria_principal: 'TV',
      subcategoria: it.subcategoria === 'Geral' ? 'Soundbox' : it.subcategoria,
    };
  }

  return it;
}

function isIgnorableItem(it: ItemVenda): boolean {
  const nomeProduto = (it.descricao_normalizada || it.descricao_original || '').trim().toUpperCase();
  return nomeProduto === 'PRODUTO NÃO IDENTIFICADO' && it.valor_item === 0;
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
  let inicioKey = toDateKey(dInicio);
  let fimKey = toDateKey(dFim);
  if (inicioKey !== null && fimKey !== null && inicioKey > fimKey) {
    [inicioKey, fimKey] = [fimKey, inicioKey];
  }
  const inicioKey = toDateKey(dInicio);
  const fimKey = toDateKey(dFim);

  return vendas.filter((v: Venda) => {
    const vendaDateKey = toDateKey(v.data_instalacao);
    if (inicioKey !== null && (vendaDateKey === null || vendaDateKey < inicioKey)) return false;
    if (fimKey !== null && (vendaDateKey === null || vendaDateKey > fimKey)) return false;
    // Vendedor: comparar com ambos os campos (normalizado pode estar vazio)
    if (filters.vendedor.length > 0) {
      const hasMatch = filters.vendedor.some(f => {
        const fClean = cleanString(f);
        return fClean === cleanString(v.vendedor) || fClean === cleanString(v.vendedor_normalizado);
      });
      if (!hasMatch) return false;
    }
    // Supervisor: comparar com ambos os campos
    if (filters.supervisor.length > 0) {
      const hasMatch = filters.supervisor.some(f => {
        const fClean = cleanString(f);
        return fClean === cleanString(v.supervisor) || fClean === cleanString(v.supervisor_normalizado);
      });
      if (!hasMatch) return false;
    }
    // Empresa: normalizar comparação
    if (filters.empresa.length > 0 && !filters.empresa.some(f => cleanString(f) === cleanString(String(v.empresa_venda)))) return false;
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
      const supClean = cleanString(userInfo.nome_supervisor_vinculado);
      const filtered = allVendas.filter(v => {
        const supField = cleanString(v.supervisor);
        const supNorm = cleanString(v.supervisor_normalizado);
        // Comparação exata primeiro, fallback para includes
        return supField === supClean || supNorm === supClean
          || supField.includes(supClean) || supClean.includes(supField)
          || supNorm.includes(supClean) || supClean.includes(supNorm);
      });
      console.log(`[Filtro Perfil] Supervisor "${userInfo.nome_supervisor_vinculado}" (clean: "${supClean}") => ${filtered.length}/${allVendas.length} vendas`);
      return filtered;
    }

    // Vendedores/Consultores veem apenas suas próprias vendas
    if ((perfil === 'vendedor' || perfil === 'consultor') && userInfo.nome_vendedor_vinculado) {
      const vendClean = cleanString(userInfo.nome_vendedor_vinculado);
      const filtered = allVendas.filter(v => {
        const vendField = cleanString(v.vendedor);
        const vendNorm = cleanString(v.vendedor_normalizado);
        // Comparação exata primeiro, fallback para includes
        return vendField === vendClean || vendNorm === vendClean
          || vendField.includes(vendClean) || vendClean.includes(vendField)
          || vendNorm.includes(vendClean) || vendClean.includes(vendNorm);
      });
      console.log(`[Filtro Perfil] Vendedor "${userInfo.nome_vendedor_vinculado}" (clean: "${vendClean}") => ${filtered.length}/${allVendas.length} vendas`);
      return filtered;
    }

    // Se não tem vínculo, não mostra nada
    console.warn('[Filtro Perfil] Perfil sem vínculo configurado, mostrando 0 vendas.');
    return [];
  }, [importedData, userInfo]);

  const sourceItens = useMemo(
    () => (importedData ? importedData.itens : []).map(normalizeItem).filter(it => !isIgnorableItem(it)),
    [importedData]
  );

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
