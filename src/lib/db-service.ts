import { supabaseExternal } from '@/integrations/supabase/external-client';
import { Venda, ItemVenda, MonthlyGoal } from './types';

// All operations (auth + data) use the external Supabase project
const supabase = supabaseExternal;

// ─── Helper: fetch all rows bypassing 1000-row limit ───

async function fetchAll<T>(
  table: string,
  query: {
    select?: string;
    order?: { column: string; ascending: boolean };
    filters?: Array<{ column: string; op: string; value: any }>;
  } = {}
): Promise<T[]> {
  const PAGE_SIZE = 1000;
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let q = supabaseExternal.from(table).select(query.select || '*');
    
    if (query.order) {
      q = q.order(query.order.column, { ascending: query.order.ascending });
    }
    if (query.filters) {
      for (const f of query.filters) {
        if (f.op === 'in') {
          q = q.in(f.column, f.value);
        } else if (f.op === 'eq') {
          q = q.eq(f.column, f.value);
        }
      }
    }

    q = q.range(from, from + PAGE_SIZE - 1);

    const { data, error } = await q;
    if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
    
    const rows = (data || []) as T[];
    allData = [...allData, ...rows];

    if (rows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allData;
}

// ─── Importação: salvar vendas e itens no banco ───

export async function saveImportToDatabase(
  vendas: Venda[],
  itens: ItemVenda[],
  nomeArquivo: string,
  totalLinhas: number,
  totalErros: number
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // 1. Create importacao record
  const { data: importacao, error: importErr } = await supabaseExternal
    .from('importacoes')
    .insert({
      nome_arquivo: nomeArquivo,
      importado_por: user.id,
      total_linhas: totalLinhas,
      total_inseridas: vendas.length,
      total_substituidas: 0,
      total_erros: totalErros,
    })
    .select('id')
    .single();

  if (importErr || !importacao) throw new Error(`Erro ao criar importação: ${importErr?.message}`);

  const importacaoId = importacao.id;

  // 2. Insert vendas in batches
  const BATCH_SIZE = 200;
  const vendaIdMap = new Map<string, string>(); // old id_venda -> new UUID

  for (let i = 0; i < vendas.length; i += BATCH_SIZE) {
    const batch = vendas.slice(i, i + BATCH_SIZE).map(v => ({
      importacao_id: importacaoId,
      id_venda: v.id_venda,
      proposta: v.proposta,
      contrato: v.contrato,
      id_cliente: v.id_cliente,
      cliente: v.cliente,
      tipo_cliente: v.tipo_cliente,
      id_vendedor: v.id_vendedor,
      vendedor: v.vendedor,
      vendedor_normalizado: v.vendedor_normalizado,
      valor_total: v.valor_total,
      tipo_pacote: v.tipo_pacote,
      tipo_venda: v.tipo_venda,
      data_instalacao: v.data_instalacao || null,
      forma_pagamento: v.forma_pagamento,
      com_tv_original: v.com_tv_original,
      produtos_brutos: v.produtos_brutos,
      supervisor: v.supervisor,
      supervisor_normalizado: v.supervisor_normalizado,
      quantidade_itens: v.quantidade_itens,
      e_combo: v.e_combo,
      combo_tipo: v.combo_tipo,
      possui_internet: v.possui_internet,
      possui_tv: v.possui_tv,
      possui_movel: v.possui_movel,
      possui_telefone: v.possui_telefone,
      possui_mesh: v.possui_mesh,
      possui_ponto_extra: v.possui_ponto_extra,
      possui_mudanca_tecnologia: v.possui_mudanca_tecnologia,
      possui_adicionais: v.possui_adicionais,
      chave_deduplicacao: v.chave_deduplicacao,
      empresa_venda: v.empresa_venda || null,
    }));

    const { data: insertedVendas, error: vendaErr } = await supabaseExternal
      .from('vendas')
      .upsert(batch, { onConflict: 'chave_deduplicacao' })
      .select('id, id_venda');

    if (vendaErr) throw new Error(`Erro ao inserir vendas (lote ${i}): ${vendaErr.message}`);
    insertedVendas?.forEach(iv => vendaIdMap.set(iv.id_venda, iv.id));
  }

  // 3. Insert itens in batches
  for (let i = 0; i < itens.length; i += BATCH_SIZE) {
    const batch = itens.slice(i, i + BATCH_SIZE).map(it => {
      const vendaUUID = vendaIdMap.get(it.venda_id);
      if (!vendaUUID) return null;
      return {
        venda_id: vendaUUID,
        ordem_item: it.ordem_item,
        descricao_original: it.descricao_original,
        descricao_normalizada: it.descricao_normalizada,
        valor_item: it.valor_item,
        categoria_principal: it.categoria_principal,
        subcategoria: it.subcategoria,
        grupo_combo: it.grupo_combo,
        flags_json: it.flags_json,
      };
    }).filter(Boolean);

    if (batch.length > 0) {
      const { error: itemErr } = await supabaseExternal
        .from('itens_venda')
        .insert(batch as any[]);

      if (itemErr) throw new Error(`Erro ao inserir itens (lote ${i}): ${itemErr.message}`);
    }
  }

  return { importacaoId, totalInseridas: vendas.length };
}

// ─── Carregar dados do banco ───

export async function loadVendasFromDatabase(): Promise<{ vendas: Venda[]; itens: ItemVenda[] } | null> {
  // Load ALL vendas using pagination
  const vendasRaw = await fetchAll<any>('vendas', {
    order: { column: 'data_instalacao', ascending: false },
  });

  if (!vendasRaw || vendasRaw.length === 0) return null;

  // Load ALL itens using pagination (fetch in batches by venda_id)
  const vendaIds = vendasRaw.map(v => v.id);
  let allItens: any[] = [];

  for (let i = 0; i < vendaIds.length; i += 500) {
    const batch = vendaIds.slice(i, i + 500);
    const itensPage = await fetchAll<any>('itens_venda', {
      filters: [{ column: 'venda_id', op: 'in', value: batch }],
    });
    allItens = [...allItens, ...itensPage];
  }

  // Map DB rows to app types
  const vendas: Venda[] = vendasRaw.map(v => ({
    id: v.id,
    importacao_id: v.importacao_id,
    id_venda: v.id_venda,
    proposta: v.proposta || '',
    contrato: v.contrato || '',
    id_cliente: v.id_cliente || '',
    cliente: v.cliente || '',
    tipo_cliente: v.tipo_cliente || '',
    id_vendedor: v.id_vendedor || '',
    vendedor: v.vendedor || '',
    vendedor_normalizado: v.vendedor_normalizado || '',
    valor_total: Number(v.valor_total) || 0,
    tipo_pacote: v.tipo_pacote || '',
    tipo_venda: v.tipo_venda || '',
    data_instalacao: v.data_instalacao || '',
    forma_pagamento: v.forma_pagamento || '',
    com_tv_original: v.com_tv_original || '',
    produtos_brutos: v.produtos_brutos || '',
    supervisor: v.supervisor || '',
    supervisor_normalizado: v.supervisor_normalizado || '',
    quantidade_itens: v.quantidade_itens || 0,
    e_combo: v.e_combo || false,
    combo_tipo: v.combo_tipo || '',
    possui_internet: v.possui_internet || false,
    possui_tv: v.possui_tv || false,
    possui_movel: v.possui_movel || false,
    possui_telefone: v.possui_telefone || false,
    possui_mesh: v.possui_mesh || false,
    possui_ponto_extra: v.possui_ponto_extra || false,
    possui_mudanca_tecnologia: v.possui_mudanca_tecnologia || false,
    possui_adicionais: v.possui_adicionais || false,
    chave_deduplicacao: v.chave_deduplicacao || '',
    criado_em: v.criado_em || '',
    empresa_venda: v.empresa_venda || '',
  }));

  // Map itens using id_venda for compatibility
  const vendaUUIDtoIdVenda = new Map(vendasRaw.map(v => [v.id, v.id_venda]));

  const itens: ItemVenda[] = allItens.map(it => ({
    id: it.id,
    venda_id: vendaUUIDtoIdVenda.get(it.venda_id) || it.venda_id,
    ordem_item: it.ordem_item || 0,
    descricao_original: it.descricao_original || '',
    descricao_normalizada: it.descricao_normalizada || '',
    valor_item: Number(it.valor_item) || 0,
    categoria_principal: it.categoria_principal || '',
    subcategoria: it.subcategoria || '',
    grupo_combo: it.grupo_combo || '',
    flags_json: it.flags_json || {},
  }));

  return { vendas, itens };
}

// ─── Metas mensais ───

export async function loadMetasFromDatabase(): Promise<Record<string, MonthlyGoal>> {
  const { data, error } = await supabaseExternal
    .from('metas_mensais')
    .select('*');

  if (error || !data) return {};

  const goals: Record<string, MonthlyGoal> = {};
  data.forEach(row => {
    const key = `${row.periodo_ano}-${String(row.periodo_mes).padStart(2, '0')}`;
    goals[key] = {
      meta_faturamento: Number(row.meta_faturamento) || 0,
      meta_total_vendas: Number(row.meta_total_vendas) || 0,
      meta_vendas_virtua: Number(row.meta_vendas_virtua) || 0,
    };
  });
  return goals;
}

export async function saveMetasToDatabase(goals: Record<string, MonthlyGoal>) {
  // Upsert all goals
  const rows = Object.entries(goals).map(([key, goal]) => {
    const [year, month] = key.split('-').map(Number);
    return {
      periodo_mes: month,
      periodo_ano: year,
      meta_faturamento: goal.meta_faturamento,
      meta_total_vendas: goal.meta_total_vendas,
      meta_vendas_virtua: goal.meta_vendas_virtua,
    };
  });

  if (rows.length === 0) return;

  const { error } = await supabaseExternal
    .from('metas_mensais')
    .upsert(rows, { onConflict: 'periodo_mes,periodo_ano' });

  if (error) throw new Error(`Erro ao salvar metas: ${error.message}`);
}

export async function deleteMetaFromDatabase(key: string) {
  const [year, month] = key.split('-').map(Number);
  await supabaseExternal
    .from('metas_mensais')
    .delete()
    .eq('periodo_mes', month)
    .eq('periodo_ano', year);
}
