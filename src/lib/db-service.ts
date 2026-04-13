import { supabase } from '@/integrations/supabase/client';
import { Venda, ItemVenda, MonthlyGoal } from './types';

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
    let q = (supabase.from as any)(table).select(query.select || '*');

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

// ─── Importação: inserts diretos ───

export async function saveImportToDatabase(
  vendas: Venda[],
  itens: ItemVenda[],
  nomeArquivo: string,
  totalLinhas: number,
  totalErros: number
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  console.log('[Import] Criando registro de importação...');

  // 1. Create importacao record
  const { data: importacao, error: importErr } = await supabase
    .from('importacoes')
    .insert({
      nome_arquivo: nomeArquivo,
      importado_por: user.id,
      total_linhas: totalLinhas,
    })
    .select('id')
    .single();

  if (importErr || !importacao) {
    console.error('[Import] Erro ao criar importação:', importErr);
    throw new Error(`Erro ao criar importação: ${importErr?.message}`);
  }

  const importacaoId = importacao.id;
  console.log('[Import] Importação criada:', importacaoId);

  // 2. Insert vendas in batches
  let processedCount = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < vendas.length; i += BATCH_SIZE) {
    const batch = vendas.slice(i, i + BATCH_SIZE);
    
    const vendasToInsert = batch.map(v => ({
      importacao_id: importacaoId,
      empresa_venda: v.empresa_venda || null,
      id_venda: v.id_venda,
      proposta: v.proposta || null,
      contrato: v.contrato || null,
      id_cliente: v.id_cliente || null,
      cliente: v.cliente || null,
      tipo_cliente: v.tipo_cliente || null,
      id_vendedor: v.id_vendedor || null,
      vendedor: v.vendedor || null,
      vendedor_normalizado: v.vendedor_normalizado || null,
      valor_total: v.valor_total,
      tipo_pacote: v.tipo_pacote || null,
      tipo_venda: v.tipo_venda || null,
      data_instalacao: v.data_instalacao || null,
      forma_pagamento: v.forma_pagamento || null,
      com_tv_original: v.com_tv_original || null,
      produtos_brutos: v.produtos_brutos || null,
      supervisor: v.supervisor || null,
      supervisor_normalizado: v.supervisor_normalizado || null,
      quantidade_itens: v.quantidade_itens,
      e_combo: v.e_combo,
      combo_tipo: v.combo_tipo || null,
      possui_internet: v.possui_internet,
      possui_tv: v.possui_tv,
      possui_movel: v.possui_movel,
      possui_telefone: v.possui_telefone,
      possui_mesh: v.possui_mesh,
      possui_ponto_extra: v.possui_ponto_extra,
      possui_mudanca_tecnologia: v.possui_mudanca_tecnologia,
      possui_adicionais: v.possui_adicionais,
      chave_deduplicacao: v.chave_deduplicacao || null,
    }));

    const { data: insertedVendas, error: vendaErr } = await supabase
      .from('vendas')
      .insert(vendasToInsert)
      .select('id, id_venda');

    if (vendaErr) {
      console.error(`[Import] Erro ao inserir vendas batch ${i}:`, vendaErr);
      errors.push(`Batch ${i}: ${vendaErr.message}`);
      continue;
    }

    // Map id_venda -> UUID for itens linking
    const vendaIdMap = new Map<string, string>();
    (insertedVendas || []).forEach((iv: any) => {
      vendaIdMap.set(iv.id_venda, iv.id);
    });

    // Collect itens for this batch
    const batchItens: any[] = [];
    for (const v of batch) {
      const vendaUuid = vendaIdMap.get(v.id_venda);
      if (!vendaUuid) continue;

      const vendaItens = itens.filter(it => it.venda_id === v.id_venda);
      for (const it of vendaItens) {
        batchItens.push({
          venda_id: vendaUuid,
          ordem_item: it.ordem_item,
          descricao_original: it.descricao_original || null,
          descricao_normalizada: it.descricao_normalizada || null,
          valor_item: it.valor_item,
          categoria_principal: it.categoria_principal || null,
          subcategoria: it.subcategoria || null,
          grupo_combo: it.grupo_combo || null,
          flags_json: it.flags_json || {},
        });
      }
    }

    if (batchItens.length > 0) {
      const { error: itensErr } = await supabase
        .from('itens_venda')
        .insert(batchItens);

      if (itensErr) {
        console.error(`[Import] Erro ao inserir itens batch ${i}:`, itensErr);
        errors.push(`Itens batch ${i}: ${itensErr.message}`);
      }
    }

    processedCount += batch.length;
    console.log(`[Import] Processado ${processedCount}/${vendas.length} vendas`);
  }

  if (errors.length > 0) {
    console.warn('[Import] Erros:', errors);
  }

  const { error: updateImportErr } = await supabase
    .from('importacoes')
    .update({
      total_inseridas: processedCount,
      total_erros: totalErros + errors.length,
    })
    .eq('id', importacaoId);

  if (updateImportErr) {
    console.error('[Import] Erro ao atualizar totais da importação:', updateImportErr);
  }

  console.log(`[Import] Concluído: ${processedCount} vendas processadas`);
  return { importacaoId, totalInseridas: processedCount };
}

// ─── Carregar dados do banco ───

export async function loadVendasFromDatabase(): Promise<{ vendas: Venda[]; itens: ItemVenda[] } | null> {
  const vendasRaw = await fetchAll<any>('vendas', {
    order: { column: 'data_instalacao', ascending: false },
  });

  if (!vendasRaw || vendasRaw.length === 0) return null;

  // Load itens in batches
  const vendaIds = vendasRaw.map(v => v.id);
  let allItens: any[] = [];

  for (let i = 0; i < vendaIds.length; i += 500) {
    const batch = vendaIds.slice(i, i + 500);
    const itensPage = await fetchAll<any>('itens_venda', {
      filters: [{ column: 'venda_id', op: 'in', value: batch }],
    });
    allItens = [...allItens, ...itensPage];
  }

  const vendas: Venda[] = vendasRaw.map(v => ({
    id: v.id,
    importacao_id: v.importacao_id,
    empresa_venda: v.empresa_venda || '',
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
    data_ultima_importacao: v.criado_em || '',
  }));

  const itens: ItemVenda[] = allItens.map(it => ({
    id: it.id,
    venda_id: it.venda_id,
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
  const { data, error } = await supabase
    .from('metas_mensais')
    .select('*');

  if (error || !data) return {};

  const goals: Record<string, MonthlyGoal> = {};
  data.forEach((row: any) => {
    if (row.periodo_ano && row.periodo_mes) {
      const key = `${row.periodo_ano}-${String(row.periodo_mes).padStart(2, '0')}`;
      goals[key] = {
        meta_faturamento: Number(row.meta_faturamento) || 0,
        meta_total_vendas: Number(row.meta_total_vendas) || 0,
        meta_vendas_virtua: Number(row.meta_vendas_virtua) || 0,
      };
    }
  });
  return goals;
}

export async function saveMetasToDatabase(goals: Record<string, MonthlyGoal>) {
  const rows = Object.entries(goals).map(([key, goal]) => {
    const [ano, mes] = key.split('-').map(Number);
    return {
      periodo_ano: ano,
      periodo_mes: mes,
      meta_faturamento: goal.meta_faturamento,
      meta_total_vendas: goal.meta_total_vendas,
      meta_vendas_virtua: goal.meta_vendas_virtua,
    };
  });

  if (rows.length === 0) return;

  const { error } = await supabase
    .from('metas_mensais')
    .upsert(rows, { onConflict: 'periodo_ano,periodo_mes' });

  if (error) throw new Error(`Erro ao salvar metas: ${error.message}`);
}

export async function deleteMetaFromDatabase(key: string) {
  const [ano, mes] = key.split('-').map(Number);
  await supabase
    .from('metas_mensais')
    .delete()
    .eq('periodo_ano', ano)
    .eq('periodo_mes', mes);
}
