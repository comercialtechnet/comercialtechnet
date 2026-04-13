import * as XLSX from 'xlsx';
import { Venda, ItemVenda } from './types';

function parseDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().split('T')[0];
  const s = String(val).trim();
  // dd/mm/yyyy
  const brMatch = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // yyyy-mm-dd
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  // Excel serial number
  const num = Number(val);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  return s;
}

function classifyProduct(name: string): { categoria_principal: string; subcategoria: string } {
  const n = name.toUpperCase();
  if (/VIRTUA|SOLAR|BANDA\s*LARGA/i.test(n)) {
    return { categoria_principal: 'Internet', subcategoria: /EMP/i.test(n) ? 'Empresarial' : 'Residencial' };
  }
  if (/\bTV\b|CANAIS|HBO|TELECINE|PREMIERE/i.test(n) && !/PONTO/i.test(n)) {
    return { categoria_principal: 'TV', subcategoria: /4K/i.test(n) ? 'TV 4K' : /BOX/i.test(n) ? 'TV Box' : 'TV Principal' };
  }
  if (/CHIP|MÓVEL|MOVEL|CELULAR/i.test(n) && !/DEPEND/i.test(n)) {
    return { categoria_principal: 'Móvel', subcategoria: /CONT/i.test(n) ? 'Controle' : /POS/i.test(n) ? 'Pós' : 'Pré-pago' };
  }
  if (/DEPEND.*M[OÓ]VEL|M[OÓ]VEL.*DEPEND/i.test(n)) {
    return { categoria_principal: 'Móvel', subcategoria: 'Dependente' };
  }
  if (/FONE|VOIP|TELEFONE/i.test(n) && !/M[OÓ]VEL/i.test(n)) {
    return { categoria_principal: 'Telefone / VOIP', subcategoria: 'Residencial' };
  }
  if (/WIFI.*MESH|MESH/i.test(n)) {
    return { categoria_principal: 'WiFi Mesh', subcategoria: 'WiFi Mesh' };
  }
  if (/PONTO.*EXTRA/i.test(n)) {
    return { categoria_principal: 'Ponto Extra', subcategoria: 'Ponto Extra' };
  }
  if (/MUDAN[CÇ]A.*TECNOL|MIGRA[CÇ][AÃ]O/i.test(n)) {
    return { categoria_principal: 'Mudança de Tecnologia', subcategoria: 'Mudança de Tecnologia' };
  }
  if (/CANAL|OPCIONAL/i.test(n)) {
    return { categoria_principal: 'TV', subcategoria: 'Canais Opcionais' };
  }
  return { categoria_principal: 'Adicionais', subcategoria: 'Geral' };
}

function parseProductString(raw: string): { descricao: string; valor: number }[] {
  if (!raw) return [];
  const parts = raw.split('|').map(s => s.trim()).filter(Boolean);
  return parts.map(p => {
    const match = p.match(/R\$\s*([0-9.,]+)/);
    let valor = 0;
    if (match) {
      // Handle Brazilian number format: 1.000,00 → remove dots, replace comma
      const numStr = match[1].replace(/\./g, '').replace(',', '.');
      valor = parseFloat(numStr) || 0;
    }
    const descricao = p.replace(/\s*-?\s*R\$\s*[0-9.,]+/, '').trim();
    return { descricao, valor };
  });
}

export interface ParseResult {
  vendas: Venda[];
  itens: ItemVenda[];
  totalLinhas: number;
  erros: string[];
  nomeArquivo: string;
  sheets: { name: string; rows: number }[];
}

// Column header normalization map
const HEADER_MAP: Record<string, string> = {
  'idvenda': 'id_venda',
  'id venda': 'id_venda',
  'proposta': 'proposta',
  'contrato': 'contrato',
  'idcliente': 'id_cliente',
  'id cliente': 'id_cliente',
  'cliente': 'cliente',
  'tipocliente': 'tipo_cliente',
  'tipo cliente': 'tipo_cliente',
  'idvendedor': 'id_vendedor',
  'id vendedor': 'id_vendedor',
  'vendedor': 'vendedor',
  'valor': 'valor_total',
  'valor vendas r$': 'valor_total',
  'valortotal': 'valor_total',
  'valor total': 'valor_total',
  'tipopacote': 'tipo_pacote',
  'tipo pacote': 'tipo_pacote',
  'tipovenda': 'tipo_venda',
  'tipo venda': 'tipo_venda',
  'datainstalacao': 'data_instalacao',
  'data instalacao': 'data_instalacao',
  'data instalação': 'data_instalacao',
  'data': 'data_instalacao',
  'formapagamento': 'forma_pagamento',
  'forma pagamento': 'forma_pagamento',
  'produtos': 'produtos_brutos',
  'produto': 'produtos_brutos',
  'supervisor': 'supervisor',
  'comtv': 'com_tv_original',
  'com tv': 'com_tv_original',
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parseAnaliticoSheet(rows: Record<string, unknown>[], erros: string[]): { vendas: Venda[]; itens: ItemVenda[] } {
  if (rows.length === 0) return { vendas: [], itens: [] };

  // Map headers
  const headerKeys = Object.keys(rows[0]);
  const colMapping: Record<string, string> = {};
  headerKeys.forEach(h => {
    const norm = normalizeHeader(h);
    if (HEADER_MAP[norm]) {
      colMapping[h] = HEADER_MAP[norm];
    }
  });

  const vendas: Venda[] = [];
  const itens: ItemVenda[] = [];
  const dedup = new Set<string>();

  rows.forEach((row, idx) => {
    try {
      const m: Record<string, unknown> = {};
      Object.entries(row).forEach(([k, v]) => {
        const target = colMapping[k];
        if (target) m[target] = v;
      });

      const idVenda = String(m.id_venda || `IMP-${idx + 1}`).trim();
      const proposta = String(m.proposta || '').trim();
      const contrato = String(m.contrato || '').trim();
      const idCliente = String(m.id_cliente || '').trim();
      const chave = `${idVenda}-${proposta}-${contrato}-${idCliente}`;

      if (dedup.has(chave)) {
        erros.push(`Analítico linha ${idx + 2}: duplicada (${idVenda})`);
        return;
      }
      dedup.add(chave);

      const produtosBrutos = String(m.produtos_brutos || '');
      const produtos = parseProductString(produtosBrutos);
      const vendedor = String(m.vendedor || 'Desconhecido').trim();
      const supervisor = String(m.supervisor || 'Desconhecido').trim();

      let valorTotal = Number(m.valor_total) || 0;
      if (valorTotal === 0 && produtos.length > 0) {
        valorTotal = produtos.reduce((s, p) => s + p.valor, 0);
      }

      const vendaItens: ItemVenda[] = produtos.length > 0
        ? produtos.map((p, pi) => {
            const { categoria_principal, subcategoria } = classifyProduct(p.descricao);
            return {
              id: `imp-item-${idx}-${pi}`,
              venda_id: idVenda,
              ordem_item: pi + 1,
              descricao_original: `${p.descricao}${p.valor ? ` - R$${p.valor.toFixed(2).replace('.', ',')}` : ''}`,
              descricao_normalizada: p.descricao.toUpperCase(),
              valor_item: p.valor,
              categoria_principal,
              subcategoria,
              grupo_combo: '',
              flags_json: {},
            };
          })
        : [{
            id: `imp-item-${idx}-0`,
            venda_id: idVenda,
            ordem_item: 1,
            descricao_original: produtosBrutos || 'Produto não identificado',
            descricao_normalizada: (produtosBrutos || 'PRODUTO NÃO IDENTIFICADO').toUpperCase(),
            valor_item: valorTotal,
            categoria_principal: 'Adicionais',
            subcategoria: 'Geral',
            grupo_combo: '',
            flags_json: {},
          }];

      const categorias = [...new Set(vendaItens.map(it => it.categoria_principal))];
      const eCombo = vendaItens.length > 1;

      vendas.push({
        id: `imp-${idx}`,
        importacao_id: 'xlsx-import',
        id_venda: idVenda,
        proposta,
        contrato,
        id_cliente: idCliente,
        cliente: String(m.cliente || `Cliente ${idCliente || idx}`).trim(),
        tipo_cliente: String(m.tipo_cliente || 'F').trim().charAt(0).toUpperCase(),
        id_vendedor: String(m.id_vendedor || '').trim(),
        vendedor,
        vendedor_normalizado: vendedor.toUpperCase(),
        valor_total: valorTotal,
        tipo_pacote: String(m.tipo_pacote || (eCombo ? 'COMBO' : 'SINGLE')).trim(),
        tipo_venda: String(m.tipo_venda || 'NOVA').trim().toUpperCase(),
        data_instalacao: parseDate(m.data_instalacao),
        forma_pagamento: String(m.forma_pagamento || 'Não informado').trim(),
        com_tv_original: String(m.com_tv_original || (categorias.includes('TV') ? 'S' : 'N')).trim(),
        produtos_brutos: produtosBrutos,
        supervisor,
        supervisor_normalizado: supervisor.toUpperCase(),
        quantidade_itens: vendaItens.length,
        e_combo: eCombo,
        combo_tipo: eCombo ? categorias.sort().join(' + ') : 'Single',
        possui_internet: categorias.includes('Internet'),
        possui_tv: categorias.includes('TV'),
        possui_movel: categorias.includes('Móvel'),
        possui_telefone: categorias.includes('Telefone / VOIP'),
        possui_mesh: categorias.includes('WiFi Mesh'),
        possui_ponto_extra: categorias.includes('Ponto Extra'),
        possui_mudanca_tecnologia: categorias.includes('Mudança de Tecnologia'),
        possui_adicionais: categorias.includes('Adicionais'),
        chave_deduplicacao: chave,
        data_ultima_importacao: new Date().toISOString(),
        empresa_venda: '',
      });

      itens.push(...vendaItens);
    } catch (err) {
      erros.push(`Analítico linha ${idx + 2}: ${err instanceof Error ? err.message : 'Erro'}`);
    }
  });

  return { vendas, itens };
}

function extractEmpresaVenda(fileName: string): string {
  const name = fileName.toUpperCase().replace(/\.XLSX?$/i, '').trim();
  if (name.includes('VNA')) return 'VNA';
  if (name.includes('RDT')) return 'RDT';
  return '';
}

export function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Validate empresa from filename
        const empresaVenda = extractEmpresaVenda(file.name);
        if (!empresaVenda) {
          reject(new Error('Nome do arquivo inválido. O arquivo deve conter "VNA" ou "RDT" no nome (ex: VNA_vendas.xlsx, RDT_vendas.xlsx).'));
          return;
        }

        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetsInfo: { name: string; rows: number }[] = [];
        const erros: string[] = [];
        let vendas: Venda[] = [];
        let itens: ItemVenda[] = [];
        let totalLinhas = 0;

        const skipSheets = new Set(['planilha1']);

        for (const sheetName of wb.SheetNames) {
          if (skipSheets.has(sheetName.toLowerCase())) continue;

          const ws = wb.Sheets[sheetName];
          const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
          
          sheetsInfo.push({ name: sheetName, rows: rows.length });

          if (rows.length === 0) continue;

          const headers = Object.keys(rows[0]).map(h => normalizeHeader(h));

          const isAnalitico = headers.some(h => h.includes('idvenda') || h.includes('proposta')) &&
                              headers.some(h => h.includes('produto') || h.includes('vendedor'));

          if (isAnalitico) {
            const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
            const result = parseAnaliticoSheet(rawRows, erros);
            // Add empresa_venda to all vendas
            result.vendas.forEach(v => { v.empresa_venda = empresaVenda; });
            vendas = [...vendas, ...result.vendas];
            itens = [...itens, ...result.itens];
            totalLinhas += rawRows.length;
          } else {
            totalLinhas += rows.length;
          }
        }

        if (vendas.length === 0) {
          erros.push('Nenhuma venda encontrada. Verifique se a aba "Analítico" existe com as colunas: IdVenda, Proposta, Vendedor, Produtos');
        }

        resolve({ vendas, itens, totalLinhas, erros, nomeArquivo: file.name, sheets: sheetsInfo });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}
