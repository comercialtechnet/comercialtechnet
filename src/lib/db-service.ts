import { supabaseExternal } from '@/integrations/supabase/external-client';
import { Venda, ItemVenda, MonthlyGoal } from './types';

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

// ─── Importação: usar RPC processar_venda_com_itens ───

export async function saveImportToDatabase(
  vendas: Venda[],
  itens: ItemVenda[],
  nomeArquivo: string,
  totalLinhas: number,
  totalErros: number
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  // 1. Create importacao record (empresa_venda is derived by DB from nome_arquivo)
  const { data: importacao, error: importErr } = await supabaseExternal
    .from('importacoes')
    .insert({
      nome_arquivo: nomeArquivo,
      importado_por: user.id,
      total_linhas: totalLinhas,
    })
    .select('id')
    .single();

  if (importErr || !importacao) throw new Error(`Erro ao criar importação: ${importErr?.message}`);

  const importacaoId = importacao.id;

  // 2. Process each venda via RPC processar_venda_com_itens
  let processedCount = 0;
  const errors: string[] = [];

  for (const v of vendas) {
    const vendaItens = itens.filter(it => it.venda_id === v.id_venda);

    const pVenda = {
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
    };

    const pItens = vendaItens.map(it => ({
      ordem_item: it.ordem_item,
      descricao_original: it.descricao_original,
      descricao_normalizada: it.descricao_normalizada,
      valor_item: it.valor_item,
      categoria_principal: it.categoria_principal,
      subcategoria: it.subcategoria,
      grupo_combo: it.grupo_combo,
      flags_json: it.flags_json,
    }));

    const { error: rpcErr } = await supabaseExternal.rpc('processar_venda_com_itens', {
      p_importacao_id: importacaoId,
      p_venda: pVenda,
      p_itens: pItens,
    });

    if (rpcErr) {
      errors.push(`Venda ${v.id_venda}: ${rpcErr.message}`);
    } else {
      processedCount++;
    }
  }

  if (errors.length > 0) {
    console.warn('Erros ao processar vendas:', errors);
  }

  return { importacaoId, totalInseridas: processedCount };
}

// ─── Carregar dados do banco usando views ───

export async function loadVendasFromDatabase(): Promise<{ vendas: Venda[]; itens: ItemVenda[] } | null> {
  // Load ALL vendas from vendas table
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
    data_ultima_importacao: v.data_ultima_importacao || '',
  }));

  // Map itens - use venda id (UUID) for linking
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

// ─── Metas mensais (using competencia date) ───

export async function loadMetasFromDatabase(): Promise<Record<string, MonthlyGoal>> {
  const { data, error } = await supabaseExternal
    .from('metas_mensais')
    .select('*');

  if (error || !data) return {};

  const goals: Record<string, MonthlyGoal> = {};
  data.forEach((row: any) => {
    // Support both schemas: competencia (new) or periodo_ano/periodo_mes (current)
    let key: string;
    if (row.competencia) {
      key = (row.competencia as string).slice(0, 7);
    } else if (row.periodo_ano && row.periodo_mes) {
      key = `${row.periodo_ano}-${String(row.periodo_mes).padStart(2, '0')}`;
    } else {
      return;
    }
    goals[key] = {
      meta_faturamento: Number(row.meta_faturamento) || 0,
      meta_total_vendas: Number(row.meta_total_vendas) || 0,
      meta_vendas_virtua: Number(row.meta_vendas_virtua) || 0,
    };
  });
  return goals;
}

export async function saveMetasToDatabase(goals: Record<string, MonthlyGoal>) {
  const rows = Object.entries(goals).map(([key, goal]) => {
    // key is YYYY-MM, competencia is first day of month
    const competencia = `${key}-01`;
    return {
      competencia,
      meta_faturamento: goal.meta_faturamento,
      meta_total_vendas: goal.meta_total_vendas,
      meta_vendas_virtua: goal.meta_vendas_virtua,
    };
  });

  if (rows.length === 0) return;

  const { error } = await supabaseExternal
    .from('metas_mensais')
    .upsert(rows, { onConflict: 'competencia' });

  if (error) throw new Error(`Erro ao salvar metas: ${error.message}`);
}

export async function deleteMetaFromDatabase(key: string) {
  const competencia = `${key}-01`;
  await supabaseExternal
    .from('metas_mensais')
    .delete()
    .eq('competencia', competencia);
}
