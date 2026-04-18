import { describe, expect, it } from 'vitest';
import { filterVendas, toDateKey } from '@/lib/use-filtered-data';
import { DashboardFilters, ItemVenda, Venda } from '@/lib/types';

describe('toDateKey', () => {
  it('normaliza ISO com e sem zero padding', () => {
    expect(toDateKey('2026-04-18')).toBe(20260418);
    expect(toDateKey('2026-4-8')).toBe(20260408);
    expect(toDateKey('2026-04-18T10:30:00Z')).toBe(20260418);
  });

  it('normaliza formato BR e timestamp textual', () => {
    expect(toDateKey('18/04/2026')).toBe(20260418);
    expect(toDateKey('2026-04-18 00:00:00')).toBe(20260418);
    expect(toDateKey('18-04-2026')).toBe(20260418);
    expect(toDateKey('2026/04/18')).toBe(20260418);
  });

  it('aceita Date e serial do Excel', () => {
    expect(toDateKey(new Date('2026-04-18T12:00:00Z'))).toBe(20260418);
    expect(toDateKey(46030)).toBe(20260108);
  });

  it('retorna null para valor inválido', () => {
    expect(toDateKey('data invalida')).toBeNull();
    expect(toDateKey('31/02/2026')).toBeNull();
    expect(toDateKey(undefined)).toBeNull();
    expect(toDateKey(0)).toBeNull();
  });
});

describe('filterVendas', () => {
  const baseFilters: DashboardFilters = {
    dataInicio: '',
    dataFim: '',
    vendedor: [],
    supervisor: [],
    categoriaPrincipal: '',
    subcategoria: '',
    tipoVenda: [],
    tipoCliente: '',
    formaPagamento: '',
    tipoFiltro: [],
    empresa: [],
    busca: '',
    compDataInicio: '',
    compDataFim: '',
  };

  const mkVenda = (id: string, data_instalacao: string): Venda => ({
    id,
    importacao_id: 'imp',
    empresa_venda: 'RDT',
    id_venda: `V-${id}`,
    proposta: '',
    contrato: '',
    id_cliente: '',
    cliente: 'Cliente',
    tipo_cliente: 'F',
    id_vendedor: '1',
    vendedor: 'João da Silva',
    vendedor_normalizado: 'JOAO DA SILVA',
    valor_total: 100,
    tipo_pacote: 'SINGLE',
    tipo_venda: 'NOVA',
    data_instalacao,
    forma_pagamento: 'PIX',
    com_tv_original: 'N',
    produtos_brutos: '',
    supervisor: 'Maria',
    supervisor_normalizado: 'MARIA',
    quantidade_itens: 1,
    e_combo: false,
    combo_tipo: 'Single',
    possui_internet: true,
    possui_tv: false,
    possui_movel: false,
    possui_telefone: false,
    possui_mesh: false,
    possui_ponto_extra: false,
    possui_mudanca_tecnologia: false,
    possui_adicionais: false,
    chave_deduplicacao: `${id}`,
    data_ultima_importacao: '',
  });

  it('filtra corretamente quando datas vêm em formatos diferentes', () => {
    const vendas: Venda[] = [
      mkVenda('1', '2025-06-05'),
      mkVenda('2', '05/06/2025'),
      mkVenda('3', '05-06-2025'),
      mkVenda('4', '2025/06/05'),
      mkVenda('5', '2025-07-01'),
    ];
    const itens: ItemVenda[] = [];

    const filtered = filterVendas(vendas, itens, {
      ...baseFilters,
      dataInicio: '2025-06-05',
      dataFim: '2025-06-05',
    });

    expect(filtered.map(v => v.id)).toEqual(['1', '2', '3', '4']);
  });
});
