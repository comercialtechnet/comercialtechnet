import { Venda, ItemVenda, Meta } from './types';

const vendedores = [
  { nome: 'Ana Silva', supervisor: 'Carlos Mendes' },
  { nome: 'Bruno Costa', supervisor: 'Carlos Mendes' },
  { nome: 'Camila Santos', supervisor: 'Carlos Mendes' },
  { nome: 'Diego Oliveira', supervisor: 'Fernanda Lima' },
  { nome: 'Elena Rodrigues', supervisor: 'Fernanda Lima' },
  { nome: 'Felipe Almeida', supervisor: 'Fernanda Lima' },
  { nome: 'Gabriela Souza', supervisor: 'Roberto Nunes' },
  { nome: 'Hugo Martins', supervisor: 'Roberto Nunes' },
  { nome: 'Isabela Ferreira', supervisor: 'Roberto Nunes' },
  { nome: 'João Pedro Lima', supervisor: 'Roberto Nunes' },
];

const produtos = [
  'VIRTUA 600MB - R$79,90',
  'VIRTUA 350MB - R$59,90',
  'VIRTUA 1GB - R$119,90',
  'TV TOP 4K - R$49,90',
  'TV BOX HD - R$29,90',
  'CHIP CONT 25GB (20+5) - R$44,90',
  'CHIP POS 50GB - R$89,90',
  'CHIP DEP MÓVEL 15GB - R$34,90',
  'FONE ILIMITADO - R$29,90',
  'WIFI MESH - R$19,90',
  'PONTO EXTRA TV - R$14,90',
  'DCC RESIDENCIAL - R$9,90',
];

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateVendas(): { vendas: Venda[]; itens: ItemVenda[] } {
  const vendas: Venda[] = [];
  const itens: ItemVenda[] = [];
  const start = new Date(2025, 0, 1);
  const end = new Date(2025, 2, 18);

  for (let i = 0; i < 250; i++) {
    const vendedor = vendedores[Math.floor(Math.random() * vendedores.length)];
    const numProdutos = Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 2 : 1;
    const selectedProducts: string[] = [];
    const usedIndices = new Set<number>();

    for (let j = 0; j < numProdutos; j++) {
      let idx: number;
      do { idx = Math.floor(Math.random() * produtos.length); } while (usedIndices.has(idx));
      usedIndices.add(idx);
      selectedProducts.push(produtos[idx]);
    }

    const produtosStr = selectedProducts.join(' | ');
    const date = randomDate(start, end);
    const vendaId = `V${String(i + 1).padStart(5, '0')}`;
    const proposta = `P${String(i + 1000).padStart(6, '0')}`;
    const contrato = `C${String(i + 2000).padStart(6, '0')}`;
    const idCliente = `CL${String(Math.floor(Math.random() * 500) + 1).padStart(5, '0')}`;

    let valorTotal = 0;
    const vendaItens: ItemVenda[] = [];

    selectedProducts.forEach((p, idx) => {
      const match = p.match(/R\$([0-9.,]+)/);
      const valor = match ? parseFloat(match[1].replace(',', '.')) : 0;
      valorTotal += valor;

      const nome = p.split(' - R$')[0].trim();
      let cat = 'Adicionais';
      let subcat = 'Geral';

      if (/VIRTUA|SOLAR/i.test(nome)) { cat = 'Internet'; subcat = /EMP/i.test(nome) ? 'Empresarial' : 'Residencial'; }
      else if (/TV|CANAIS/i.test(nome)) { cat = 'TV'; subcat = /4K/i.test(nome) ? 'TV 4K' : /BOX/i.test(nome) ? 'TV Box' : 'TV Principal'; }
      else if (/CHIP|MÓVEL/i.test(nome)) { cat = 'Móvel'; subcat = /CONT/i.test(nome) ? 'Controle' : /POS/i.test(nome) ? 'Pós' : 'Dependente'; }
      else if (/FONE|VOIP|TELEFONE/i.test(nome)) { cat = 'Telefone / VOIP'; subcat = 'Residencial'; }
      else if (/WIFI MESH/i.test(nome)) { cat = 'WiFi Mesh'; subcat = 'WiFi Mesh'; }
      else if (/PONTO EXTRA/i.test(nome)) { cat = 'Ponto Extra'; subcat = 'Ponto Extra'; }
      else if (/DCC/i.test(nome)) { cat = 'Adicionais'; subcat = 'DCC'; }

      vendaItens.push({
        id: `item-${i}-${idx}`,
        venda_id: vendaId,
        ordem_item: idx + 1,
        descricao_original: p,
        descricao_normalizada: nome.toUpperCase(),
        valor_item: valor,
        categoria_principal: cat,
        subcategoria: subcat,
        grupo_combo: '',
        flags_json: {},
      });
    });

    const categorias = [...new Set(vendaItens.map(it => it.categoria_principal))];
    const eCombo = vendaItens.length > 1;
    const comboTipo = eCombo ? categorias.sort().join(' + ') : 'Single';

    vendas.push({
      id: `venda-${i}`,
      importacao_id: 'imp-001',
      id_venda: vendaId,
      proposta,
      contrato,
      id_cliente: idCliente,
      cliente: `Cliente ${idCliente}`,
      tipo_cliente: Math.random() > 0.2 ? 'F' : 'J',
      id_vendedor: `VD${String(i).padStart(4, '0')}`,
      vendedor: vendedor.nome,
      vendedor_normalizado: vendedor.nome.toUpperCase(),
      valor_total: valorTotal,
      tipo_pacote: eCombo ? 'COMBO' : 'SINGLE',
      tipo_venda: Math.random() > 0.3 ? 'NOVA' : 'UP',
      data_instalacao: date.toISOString().split('T')[0],
      forma_pagamento: Math.random() > 0.5 ? 'Débito Automático' : 'Boleto',
      com_tv_original: categorias.includes('TV') ? 'S' : 'N',
      produtos_brutos: produtosStr,
      supervisor: vendedor.supervisor,
      supervisor_normalizado: vendedor.supervisor.toUpperCase(),
      quantidade_itens: vendaItens.length,
      e_combo: eCombo,
      combo_tipo: comboTipo,
      possui_internet: categorias.includes('Internet'),
      possui_tv: categorias.includes('TV'),
      possui_movel: categorias.includes('Móvel'),
      possui_telefone: categorias.includes('Telefone / VOIP'),
      possui_mesh: categorias.includes('WiFi Mesh'),
      possui_ponto_extra: categorias.includes('Ponto Extra'),
      possui_mudanca_tecnologia: false,
      possui_adicionais: categorias.includes('Adicionais'),
      chave_deduplicacao: `${vendaId}-${proposta}-${contrato}-${idCliente}`,
      criado_em: new Date().toISOString(),
    });

    itens.push(...vendaItens);
  }

  return { vendas, itens };
}

export const { vendas: mockVendas, itens: mockItens } = generateVendas();

export const mockMetas: Meta[] = [
  { id: 'm1', periodo_mes: 3, periodo_ano: 2025, tipo_meta: 'vendedor', escopo: 'vendedor', nome_escopo: 'Ana Silva', categoria: 'geral', meta_faturamento: 15000, meta_vendas: 30, meta_produtos: 50, meta_combos: 15 },
  { id: 'm2', periodo_mes: 3, periodo_ano: 2025, tipo_meta: 'vendedor', escopo: 'vendedor', nome_escopo: 'Bruno Costa', categoria: 'geral', meta_faturamento: 12000, meta_vendas: 25, meta_produtos: 40, meta_combos: 12 },
  { id: 'm3', periodo_mes: 3, periodo_ano: 2025, tipo_meta: 'supervisor', escopo: 'supervisor', nome_escopo: 'Carlos Mendes', categoria: 'geral', meta_faturamento: 40000, meta_vendas: 80, meta_produtos: 130, meta_combos: 40 },
  { id: 'm4', periodo_mes: 3, periodo_ano: 2025, tipo_meta: 'supervisor', escopo: 'supervisor', nome_escopo: 'Fernanda Lima', categoria: 'geral', meta_faturamento: 35000, meta_vendas: 70, meta_produtos: 120, meta_combos: 35 },
  { id: 'm5', periodo_mes: 3, periodo_ano: 2025, tipo_meta: 'supervisor', escopo: 'supervisor', nome_escopo: 'Roberto Nunes', categoria: 'geral', meta_faturamento: 45000, meta_vendas: 90, meta_produtos: 150, meta_combos: 45 },
];
