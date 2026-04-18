import { supabaseExternal as supabase } from '@/integrations/supabase/external-client';
import { Venda, ItemVenda, MonthlyGoal } from './types';
import type { UserInfo } from './filters-context';

type QueryFilter = { column: string; op: 'in' | 'eq'; value: unknown };
type RawRow = Record<string, unknown>;
type RawVendaWithItens = RawRow & { itens_venda?: RawRow[] };

// ─── Helper: fetch all rows bypassing 1000-row limit ───

async function fetchAll<T>(
  table: string,
  query: {
    select?: string;
    order?: { column: string; ascending: boolean };
    filters?: QueryFilter[];
  } = {},
  onProgress?: (loaded: number, total: number) => void
): Promise<T[]> {
  const PAGE_SIZE = 5000;

  // Constrói a base da query para contar e buscar
  const buildQueryBase = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase.from(table as 'vendas' | 'itens_venda' | 'importacoes' | 'metas_mensais' | 'profiles' | 'user_roles');
    if (query.filters) {
      for (const f of query.filters) {
        if (f.op === 'in') q = q.in(f.column, f.value as string[]);
        else if (f.op === 'eq') q = q.eq(f.column, f.value as string);
      }
    }
    return q;
  };

  // 1. Pega o Count total primeiro
  const { count, error: countError } = await buildQueryBase().select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Erro ao contar ${table}: ${countError.message}`);

  if (!count || count === 0) return [];

  // 2. Prepara todas as páginas
  const totalPages = Math.ceil(count / PAGE_SIZE);
  const tasks = [];
  for (let page = 0; page < totalPages; page++) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    tasks.push(async () => {
      let q = buildQueryBase().select(query.select || '*');
      if (query.order) q = q.order(query.order.column, { ascending: query.order.ascending });
      const { data, error } = await q.range(from, to);
      if (error) throw new Error(`Erro ao buscar ${table}: ${error.message}`);
      return (data || []) as T[];
    });
  }

  // 3. Roda em paralelo (com limite de 5 por vez pra não dar Rate Limit c/ Supabase)
  const CONCURRENCY = 5;
  let allData: T[] = [];
  for (let i = 0; i < tasks.length; i += CONCURRENCY) {
    const batch = tasks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(t => t()));
    for (const res of results) {
      allData = [...allData, ...res];
    }
    onProgress?.(allData.length, count);
  }

  return allData;
}

async function loadExistingDedupKeys(keys: string[]): Promise<Set<string>> {
  const existing = new Set<string>();

  if (keys.length === 0) return existing;

  const CHUNK_SIZE = 500;

  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunk = keys.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
      .from('vendas')
      .select('chave_deduplicacao')
      .in('chave_deduplicacao', chunk);

    if (error) {
      throw new Error(`Erro ao verificar duplicidades: ${error.message}`);
    }

    (data || []).forEach((row) => {
      if (row.chave_deduplicacao) {
        existing.add(row.chave_deduplicacao);
      }
    });
  }

  return existing;
}

// ─── Importação: inserts diretos ───

export async function saveImportToDatabase(
  vendas: Venda[],
  itens: ItemVenda[],
  nomeArquivo: string,
  totalLinhas: number,
  totalErros: number,
  onProgress?: (step: string, percent: number) => void
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const uniqueKeys = [...new Set(vendas.map(v => v.chave_deduplicacao).filter(Boolean))];
  onProgress?.('Verificando duplicidades...', 10);
  const existingKeys = await loadExistingDedupKeys(uniqueKeys);
  const duplicateCount = vendas.filter(v => v.chave_deduplicacao && existingKeys.has(v.chave_deduplicacao)).length;
  const novasVendasCount = vendas.length - duplicateCount;

  const getItemJoinKey = (venda: Pick<Venda, 'chave_deduplicacao' | 'id_venda'>) =>
    venda.chave_deduplicacao?.trim() || venda.id_venda.trim();

  const itensPorVenda = new Map<string, ItemVenda[]>();
  itens.forEach((item) => {
    const current = itensPorVenda.get(item.venda_id);
    if (current) {
      current.push(item);
      return;
    }
    itensPorVenda.set(item.venda_id, [item]);
  });

  console.log('[Import] Criando registro de importação...');
  onProgress?.('Criando registro de importação...', 20);

  // 1. Create importacao record
  const { data: importacao, error: importErr } = await supabase
    .from('importacoes')
    .insert({
      nome_arquivo: nomeArquivo,
      importado_por: user.id,
      total_linhas: totalLinhas,
      total_inseridas: novasVendasCount,
      total_substituidas: duplicateCount,
      total_erros: totalErros,
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
  let updatedCount = 0;
  let insertedCount = 0;
  const errors: string[] = [];
  const BATCH_SIZE = 50;

  for (let i = 0; i < vendas.length; i += BATCH_SIZE) {
    const batch = vendas.slice(i, i + BATCH_SIZE);
    const batchPercent = Math.round(20 + (i / vendas.length) * 70);
    onProgress?.(`Enviando vendas... (${Math.min(i + BATCH_SIZE, vendas.length)}/${vendas.length})`, batchPercent);

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
      .upsert(vendasToInsert, {
        onConflict: 'chave_deduplicacao',
      })
      .select('id, id_venda, chave_deduplicacao');

    if (vendaErr) {
      console.error(`[Import] Erro ao inserir vendas batch ${i}:`, vendaErr);
      errors.push(`Batch ${i}: ${vendaErr.message}`);
      continue;
    }

    // Map chave da venda -> UUID para vincular itens corretamente
    const vendaIdMap = new Map<string, string>();
    (insertedVendas || []).forEach((iv: { id_venda: string; id: string; chave_deduplicacao?: string | null }) => {
      const key = iv.chave_deduplicacao?.trim() || iv.id_venda;
      vendaIdMap.set(key, iv.id);
    });

    // Collect itens for this batch
    const batchItens: Array<{
      venda_id: string;
      ordem_item: number;
      descricao_original: string | null;
      descricao_normalizada: string | null;
      valor_item: number;
      categoria_principal: string | null;
      subcategoria: string | null;
      grupo_combo: string | null;
      flags_json: Record<string, boolean>;
    }> = [];
    for (const v of batch) {
      const vendaUuid = vendaIdMap.get(getItemJoinKey(v));
      if (!vendaUuid) continue;

      // Compatibilidade: tenta a chave composta e, se necessário, o id_venda legado
      const vendaItens = itensPorVenda.get(getItemJoinKey(v)) || itensPorVenda.get(v.id_venda) || [];
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

    const upsertedIds = (insertedVendas || []).map(v => v.id).filter(Boolean);
    if (upsertedIds.length > 0) {
      const { error: deleteItensErr } = await supabase
        .from('itens_venda')
        .delete()
        .in('venda_id', upsertedIds);

      if (deleteItensErr) {
        console.error(`[Import] Erro ao limpar itens antigos batch ${i}:`, deleteItensErr);
        errors.push(`Delete itens batch ${i}: ${deleteItensErr.message}`);
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

    const batchUpdated = batch.filter(v => v.chave_deduplicacao && existingKeys.has(v.chave_deduplicacao)).length;
    const batchInserted = batch.length - batchUpdated;
    processedCount += insertedVendas?.length || 0;
    updatedCount += batchUpdated;
    insertedCount += batchInserted;
    console.log(`[Import] Processado ${processedCount}/${vendas.length} vendas`);
  }

  if (errors.length > 0) {
    console.warn('[Import] Erros:', errors);
  }

  console.log(`[Import] Concluído: ${processedCount} vendas processadas`);
  onProgress?.('Importação concluída!', 100);
  return {
    importacaoId,
    totalInseridas: insertedCount,
    totalDuplicadas: duplicateCount,
    totalAtualizadas: updatedCount,
    totalNovas: insertedCount,
    totalProcessadas: processedCount,
    totalErros: totalErros + errors.length,
  };
}

// ─── Carregar dados do banco ───

export async function loadVendasFromDatabase(profile?: UserInfo | null, onProgress?: (step: string, percent: number) => void): Promise<{ vendas: Venda[]; itens: ItemVenda[] } | null> {
  // Otimização: Select aninhado (Native Join no Supabase) - traz as vendas e seus itens em apenas 1 requisição
  const vendasSelect = 'id,importacao_id,empresa_venda,id_venda,proposta,contrato,id_cliente,cliente,tipo_cliente,id_vendedor,vendedor,vendedor_normalizado,valor_total,tipo_pacote,tipo_venda,data_instalacao,forma_pagamento,com_tv_original,produtos_brutos,supervisor,supervisor_normalizado,quantidade_itens,e_combo,combo_tipo,possui_internet,possui_tv,possui_movel,possui_telefone,possui_mesh,possui_ponto_extra,possui_mudanca_tecnologia,possui_adicionais,chave_deduplicacao,criado_em, itens_venda ( id, venda_id, ordem_item, descricao_original, descricao_normalizada, valor_item, categoria_principal, subcategoria, grupo_combo, flags_json )';

  // Aplicação da Filtragem no Banco (Server-side) desativada para evitar bloqueio por acentuação
  // Será executada de forma flexível no Client-Side via use-filtered-data.ts
  const filters: QueryFilter[] = [];
  // if (profile?.perfil === 'supervisor' && profile?.nome_supervisor_vinculado) {
  //   filters.push({ column: 'supervisor', op: 'ilike', value: `%${profile.nome_supervisor_vinculado.trim()}%` });
  // } else if ((profile?.perfil === 'vendedor' || profile?.perfil === 'consultor') && profile?.nome_vendedor_vinculado) {
  //   filters.push({ column: 'vendedor', op: 'ilike', value: `%${profile.nome_vendedor_vinculado.trim()}%` });
  // }

  onProgress?.('Buscando informações no banco de dados...', 35);

  const vendasRaw = await fetchAll<RawVendaWithItens>('vendas', {
    select: vendasSelect,
    order: { column: 'data_instalacao', ascending: false },
    filters
  }, (loaded, total) => {
    const pct = Math.round(35 + (loaded / Math.max(total, 1)) * 50);
    onProgress?.(`Buscando informações no banco de dados... (${loaded}/${total})`, Math.min(pct, 85));
  });

  if (!vendasRaw || vendasRaw.length === 0) return null;

  const allItens: RawRow[] = [];

  const vendas: Venda[] = vendasRaw.map(v => {
    // Array nativo provido pelo select do PostgREST
    if (v.itens_venda && Array.isArray(v.itens_venda)) {
      v.itens_venda.forEach((it: RawRow) => allItens.push(it));
    }

    return {
      id: String(v.id ?? ''),
      importacao_id: String(v.importacao_id ?? ''),
      empresa_venda: String(v.empresa_venda ?? ''),
      id_venda: String(v.id_venda ?? ''),
      proposta: String(v.proposta ?? ''),
      contrato: String(v.contrato ?? ''),
      id_cliente: String(v.id_cliente ?? ''),
      cliente: String(v.cliente ?? ''),
      tipo_cliente: String(v.tipo_cliente ?? ''),
      id_vendedor: String(v.id_vendedor ?? ''),
      vendedor: String(v.vendedor ?? ''),
      vendedor_normalizado: String(v.vendedor_normalizado ?? ''),
      valor_total: Number(v.valor_total ?? 0) || 0,
      tipo_pacote: String(v.tipo_pacote ?? ''),
      tipo_venda: String(v.tipo_venda ?? ''),
      data_instalacao: String(v.data_instalacao ?? ''),
      forma_pagamento: String(v.forma_pagamento ?? ''),
      com_tv_original: String(v.com_tv_original ?? ''),
      produtos_brutos: String(v.produtos_brutos ?? ''),
      supervisor: String(v.supervisor ?? ''),
      supervisor_normalizado: String(v.supervisor_normalizado ?? ''),
      quantidade_itens: Number(v.quantidade_itens ?? 0) || 0,
      e_combo: Boolean(v.e_combo),
      combo_tipo: String(v.combo_tipo ?? ''),
      possui_internet: Boolean(v.possui_internet),
      possui_tv: Boolean(v.possui_tv),
      possui_movel: Boolean(v.possui_movel),
      possui_telefone: Boolean(v.possui_telefone),
      possui_mesh: Boolean(v.possui_mesh),
      possui_ponto_extra: Boolean(v.possui_ponto_extra),
      possui_mudanca_tecnologia: Boolean(v.possui_mudanca_tecnologia),
      possui_adicionais: Boolean(v.possui_adicionais),
      chave_deduplicacao: String(v.chave_deduplicacao ?? ''),
      data_ultima_importacao: String(v.criado_em ?? ''),
    };
  });

  const itens: ItemVenda[] = allItens.map(it => ({
    id: String(it.id ?? ''),
    venda_id: String(it.venda_id ?? ''),
    ordem_item: Number(it.ordem_item ?? 0) || 0,
    descricao_original: String(it.descricao_original ?? ''),
    descricao_normalizada: String(it.descricao_normalizada ?? ''),
    valor_item: Number(it.valor_item ?? 0) || 0,
    categoria_principal: String(it.categoria_principal ?? ''),
    subcategoria: String(it.subcategoria ?? ''),
    grupo_combo: String(it.grupo_combo ?? ''),
    flags_json: (it.flags_json as Record<string, boolean> | undefined) || {},
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
  data.forEach((row: { periodo_ano: number | null; periodo_mes: number | null; meta_faturamento: number | null; meta_total_vendas: number | null; meta_vendas_virtua: number | null }) => {
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
